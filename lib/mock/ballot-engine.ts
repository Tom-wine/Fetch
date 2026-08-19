import { rngFor } from './rng'
import type {
  BallotProfile,
  BallotRun,
  BallotTask,
  EventLevel,
  RunEvent,
  RunStatus,
  TaskStatus,
} from '@/lib/types'

/**
 * The simulated ballot engine (§B6).
 *
 * THE ONE IDEA: progress is DERIVED FROM ELAPSED WALL-CLOCK TIME, never from a timer.
 *
 * There is no `setInterval` anywhere in this file. On every request `advance()` asks
 * "given how long this run has been going, the profile's concurrency and its delay,
 * where should it be by now?" and materialises whatever transitions are missing,
 * emitting their events as it goes.
 *
 * Three things follow from that, and they are the reason it is written this way:
 *
 *   · It survives a page reload. The run does not live in a component, so F5 recomputes
 *     the same position from the same `startedAt` rather than restarting.
 *   · It leaks nothing. A timer left running on a finished run is the easiest leak to
 *     write and the hardest to see; there is no timer to leave running.
 *   · It replays identically. Outcomes are seeded by runId, so the same run always
 *     fails the same tasks in the same order, whatever the machine or the hour.
 *
 * A real backend would push these transitions from actual workers. The shapes on the
 * wire are the same either way, which is the point.
 *
 * THE SECOND IDEA: events are SORTED BY WHEN THEY HAPPENED BEFORE THEY ARE NUMBERED.
 * The sweep walks tasks in task order while the tasks themselves run concurrently, so
 * the order transitions are produced in is not the order they occurred in. `seq` is
 * handed out at flush time, from a batch sorted by `at` -- see `flushEvents`.
 */

/* ------------------------------------------------------------------ outcomes */

/** §B6's distribution. Cumulative, so one draw picks a bucket. */
const OUTCOMES: Array<{ status: TaskStatus; upTo: number }> = [
  { status: 'SUCCESS', upTo: 0.78 },
  { status: 'FAILED', upTo: 0.9 },
  { status: 'NEEDS_OTP', upTo: 0.97 },
  { status: 'SKIPPED', upTo: 1 },
]

/**
 * The failure vocabulary. A code is not an explanation (§B7 rule 3), so every one
 * carries the sentence the operator actually reads.
 */
const FAILURES: Array<{ code: string; httpStatus: number; message: string }> = [
  {
    code: 'RATE_LIMITED',
    httpStatus: 429,
    message: 'The club refused the entry for going too fast. Lower the concurrency and try again.',
  },
  {
    code: 'BLOCKED',
    httpStatus: 403,
    message: 'The club blocked this attempt. The account may need to sign in on the club site first.',
  },
  {
    code: 'PROXY_DEAD',
    httpStatus: 407,
    message: 'The proxy stopped responding mid-entry. Nothing was submitted.',
  },
  {
    code: 'UPSTREAM_ERROR',
    httpStatus: 500,
    message: 'The club site returned an error. This one is worth retrying.',
  },
]

const OTP_TIMEOUT = {
  code: 'OTP_TIMEOUT',
  httpStatus: 408,
  message: 'A code was sent but never arrived. Enter it by hand, or switch the profile to IMAP.',
}

const SKIPPED_REASON = {
  code: 'SKIPPED',
  httpStatus: undefined,
  message: 'Skipped: the membership is not eligible for this ballot.',
}

/* -------------------------------------------------------------- the run state */

/**
 * Everything the engine needs that is not on the wire.
 *
 * `pausedMs` is what makes pause honest: the clock is not stopped, so pausing records
 * how much of the elapsed time should not count, and resuming stops adding to it. The
 * alternative — rewriting `startedAt` on resume — loses when the run actually began,
 * which is the one thing the header shows.
 */
export interface RunState {
  run: BallotRun
  tasks: BallotTask[]
  events: RunEvent[]
  profile: BallotProfile
  /** Total milliseconds spent paused, excluded from elapsed. */
  pausedMs: number
  /** When the current pause began. Absent unless status is PAUSED. */
  pausedAt?: number
  /** How far the engine has already materialised, in task-slots. */
  materialised: number
  /**
   * Events that have happened but have not been given their `seq` yet. Never on the
   * wire, and empty between calls -- see `flushEvents`.
   */
  pending?: PendingEvent[]
}

/** One task's whole timeline, decided up front from the run's own seed. */
interface Plan {
  /** Slot index — which worker, and how many tasks precede it on that worker. */
  lane: number
  order: number
  /** ms from run start to this task's first attempt. */
  startOffset: number
  durationMs: number
  /** The final resting status. */
  outcome: TaskStatus
  /** True when the first attempt fails and a second is made. */
  retries: boolean
  retryDurationMs: number
  failure: (typeof FAILURES)[number]
}

/* ------------------------------------------------------------------ planning */

/**
 * The whole run's shape, computed once from `runId` and never stored.
 *
 * Deterministic by seed rather than by insertion order: ask for task 40's plan without
 * having asked for task 39's and you get the same answer, which is what lets `advance`
 * jump straight to wherever the clock says the run is.
 */
function planFor(runId: string, taskIndex: number, profile: BallotProfile): Plan {
  const r = rngFor(`${runId}:${taskIndex}`)

  const lane = taskIndex % profile.concurrency
  const order = Math.floor(taskIndex / profile.concurrency)

  // Each worker does its tasks back to back, with the profile's delay between them.
  const delay = profile.delayMinMs + r.next() * (profile.delayMaxMs - profile.delayMinMs)
  const durationMs = 900 + Math.floor(r.next() * 2600)

  const roll = r.next()
  const outcome = OUTCOMES.find((o) => roll <= o.upTo)?.status ?? 'SUCCESS'
  const failure = FAILURES[Math.floor(r.next() * FAILURES.length)]!

  // A retry is a real second attempt, visible in ATTEMPT (§B6). Only transient-looking
  // failures get one, and only when the profile allows it.
  const retries =
    profile.maxRetries > 0 && (outcome === 'FAILED' || outcome === 'SUCCESS') && r.next() < 0.18
  const retryDurationMs = 900 + Math.floor(r.next() * 1800)

  // Every earlier task on this lane, plus its delay. Averaged rather than summed
  // exactly, because each lane's own draws are independent and the wall-clock position
  // has to be computable without walking every predecessor.
  const perTask = (profile.delayMinMs + profile.delayMaxMs) / 2 + 2200
  const startOffset = order * perTask + delay * 0.25

  return { lane, order, startOffset, durationMs, outcome, retries, retryDurationMs, failure }
}

/** When a task has fully settled, relative to run start. */
function settleOffset(plan: Plan): number {
  return plan.startOffset + plan.durationMs + (plan.retries ? plan.retryDurationMs + 600 : 0)
}

/**
 * A plan offset is VIRTUAL time -- it excludes whatever the run spent paused. The log
 * is wall-clock, so every offset is mapped back through `pausedMs` before it becomes
 * an `at`. Without this, an event materialised after a pause would carry a timestamp
 * from before the pause, which is the same lie in a different disguise.
 */
function wallClock(state: RunState, offset: number): number {
  return Date.parse(state.run.startedAt) + offset + state.pausedMs
}

/* -------------------------------------------------------------------- events */

/**
 * An event that has happened but has not taken its place in the log yet.
 *
 * `tick` is the order the sweep produced it in, and it only ever breaks ties: two
 * events on the same millisecond keep the order they were materialised in.
 */
interface PendingEvent {
  atMs: number
  tick: number
  level: EventLevel
  code: string
  message: string
  taskId?: string
  httpStatus?: number
}

/** Record that something happened. It gets no `seq` here -- see `flushEvents`. */
function pushEvent(
  state: RunState,
  at: number,
  level: EventLevel,
  code: string,
  message: string,
  taskId?: string,
  httpStatus?: number,
): void {
  const pending = (state.pending ??= [])
  // Floored, because the plan's offsets are fractional and `at` on the wire is whole
  // milliseconds. Sorting on the fractional value would order two events the reader
  // sees as simultaneous by a difference that never reaches them -- and it did:
  // RUN_COMPLETED, whose time is read back off a task's ISO timestamp, sorted 0.2ms
  // ahead of the confirmation it is meant to follow. Sort on what ships.
  pending.push({
    atMs: Math.floor(at),
    tick: pending.length,
    level,
    code,
    message,
    taskId,
    httpStatus,
  })
}

/**
 * Close the batch: sort by the time each event actually happened, THEN hand out the
 * `seq` numbers in that order.
 *
 * WHY THIS EXISTS. The sweep materialises transitions task by task, in task order,
 * but the tasks run CONCURRENTLY. A slow worker's 19:28:52 event is therefore produced
 * after a fast worker's 19:28:53 one, and numbering at production time pinned that
 * accident into the log: the cursor stayed monotonic while `at` walked backwards, on
 * the one screen whose whole job is explaining a failure.
 *
 * Sorting before numbering makes the two orders agree -- `seq` ascending is `at`
 * non-decreasing. It holds ACROSS batches too, because a sweep is exhaustive: it emits
 * every event up to the clock it was handed, so anything appearing in a later batch
 * cannot have happened before something already in the log.
 */
function flushEvents(state: RunState): void {
  const pending = state.pending
  if (!pending?.length) return
  state.pending = []

  pending.sort((a, b) => a.atMs - b.atMs || a.tick - b.tick)

  for (const p of pending) {
    const seq = state.run.lastEventSeq + 1
    state.run.lastEventSeq = seq
    state.events.push({
      id: `evt_${state.run.id}_${seq}`,
      seq,
      runId: state.run.id,
      taskId: p.taskId,
      at: new Date(p.atMs).toISOString(),
      level: p.level,
      code: p.code,
      message: p.message,
      httpStatus: p.httpStatus,
    })
  }
}

/** When an event with this code first happened -- committed, or still pending. */
function firstEventTime(state: RunState, code: string): number | undefined {
  const committed = state.events.find((e) => e.code === code)
  if (committed) return Date.parse(committed.at)
  const times = (state.pending ?? []).filter((p) => p.code === code).map((p) => p.atMs)
  return times.length ? Math.min(...times) : undefined
}

/* ------------------------------------------------------------------- advance */

/**
 * Bring a run up to date with the clock. Idempotent: calling it twice in the same
 * millisecond is a no-op, which is what makes it safe to call from every handler.
 */
export function advance(state: RunState, now = Date.now()): RunState {
  sweep(state, now)
  flushEvents(state)
  return state
}

/**
 * The sweep itself. It emits into the pending buffer and never numbers anything;
 * `advance`, the only public door, is what closes the batch.
 */
function sweep(state: RunState, now: number): void {
  const { run, profile } = state

  if (run.status === 'COMPLETED' || run.status === 'STOPPED' || run.status === 'FAILED') {
    return
  }

  const startedAt = Date.parse(run.startedAt)
  const frozenAt = run.status === 'PAUSED' && state.pausedAt ? state.pausedAt : now
  const elapsed = Math.max(0, frozenAt - startedAt - state.pausedMs)

  if (run.status === 'QUEUED' && elapsed > 0) {
    run.status = 'RUNNING'
    pushEvent(state, startedAt, 'info', 'RUN_STARTED', `Run started with ${run.counts.total} accounts.`)
  }

  for (let i = 0; i < state.tasks.length; i++) {
    const task = state.tasks[i]!
    if (isTerminal(task.status)) continue

    const plan = planFor(run.id, i, profile)
    const taskStart = wallClock(state, plan.startOffset)
    const settled = wallClock(state, settleOffset(plan))

    // Not this task's turn yet — and lanes run in order, so nothing after it is either.
    if (elapsed < plan.startOffset) continue

    if (task.status === 'QUEUED') {
      task.status = 'RUNNING'
      task.attempt = 1
      task.startedAt = new Date(taskStart).toISOString()
      task.updatedAt = task.startedAt
      pushEvent(
        state,
        taskStart,
        'info',
        'SUBMITTED',
        `Entry submitted for ${task.accountEmail}.`,
        task.id,
      )
    }

    // The retry, when there is one, lands between the first attempt and the settle.
    const retryOffset = plan.startOffset + plan.durationMs + 600
    const retryAt = wallClock(state, retryOffset)
    if (plan.retries && task.attempt === 1 && elapsed >= retryOffset) {
      task.status = 'RETRYING'
      task.attempt = 2
      task.lastHttpStatus = plan.failure.httpStatus
      task.lastMessage = plan.failure.message
      task.updatedAt = new Date(retryAt).toISOString()
      pushEvent(
        state,
        retryAt,
        'warn',
        plan.failure.code,
        `${plan.failure.message} Retrying (attempt 2 of ${task.maxAttempts}).`,
        task.id,
        plan.failure.httpStatus,
      )
    }

    if (elapsed >= settleOffset(plan)) {
      settle(state, task, plan, settled)
    }
  }

  recount(state)

  // stopOnRateLimit: the first 429 ends the run rather than letting it burn through
  // the rest of the pool at the same rate.
  if (profile.stopOnRateLimit && run.status === 'RUNNING') {
    // The 429 may still be sitting in the pending buffer -- it has happened, it just
    // has no `seq` yet -- so both halves of the log are searched.
    const limitedAt = firstEventTime(state, 'RATE_LIMITED')
    if (limitedAt !== undefined) {
      // freezeAsStopped, not stop(): stop() advances first, and advance() is what
      // called us. Going through it would recurse until the stack gave out.
      freezeAsStopped(state, limitedAt, 'RATE_LIMITED')
      return
    }
  }

  if (run.status === 'RUNNING' && run.counts.queued === 0 && run.counts.running === 0) {
    run.status = 'COMPLETED'
    run.finishedAt = new Date(latestTaskTime(state, now)).toISOString()
    run.etaSeconds = undefined
    pushEvent(
      state,
      Date.parse(run.finishedAt),
      'success',
      'RUN_COMPLETED',
      `Run finished. ${run.counts.success} entered, ${run.counts.failed} failed.`,
    )
  }
}

function settle(state: RunState, task: BallotTask, plan: Plan, at: number): void {
  task.status = plan.outcome
  task.updatedAt = new Date(at).toISOString()
  task.durationMs = plan.durationMs + (plan.retries ? plan.retryDurationMs : 0)

  if (plan.outcome === 'SUCCESS') {
    task.lastHttpStatus = 200
    task.lastMessage = 'Entry confirmed by the club.'
    task.entryRef = `EN-${task.id.slice(-6).toUpperCase()}`
    pushEvent(
      state,
      at,
      'success',
      'ENTRY_CONFIRMED',
      `${task.accountEmail} is in the ballot (${task.entryRef}).`,
      task.id,
      200,
    )
    return
  }

  if (plan.outcome === 'NEEDS_OTP') {
    task.lastHttpStatus = OTP_TIMEOUT.httpStatus
    task.lastMessage = OTP_TIMEOUT.message
    pushEvent(state, at, 'warn', OTP_TIMEOUT.code, `${task.accountEmail}: ${OTP_TIMEOUT.message}`, task.id, OTP_TIMEOUT.httpStatus)
    return
  }

  if (plan.outcome === 'SKIPPED') {
    task.lastMessage = SKIPPED_REASON.message
    pushEvent(state, at, 'info', SKIPPED_REASON.code, `${task.accountEmail}: ${SKIPPED_REASON.message}`, task.id)
    return
  }

  task.lastHttpStatus = plan.failure.httpStatus
  task.lastMessage = plan.failure.message
  pushEvent(
    state,
    at,
    'error',
    plan.failure.code,
    `${task.accountEmail}: ${plan.failure.message}`,
    task.id,
    plan.failure.httpStatus,
  )
}

function isTerminal(status: TaskStatus): boolean {
  return status === 'SUCCESS' || status === 'FAILED' || status === 'NEEDS_OTP' || status === 'SKIPPED'
}

function latestTaskTime(state: RunState, fallback: number): number {
  const times = state.tasks.map((t) => Date.parse(t.updatedAt)).filter(Number.isFinite)
  return times.length ? Math.max(...times) : fallback
}

/** Counters and the derived rate/ETA, recomputed from the tasks rather than tracked. */
function recount(state: RunState): void {
  const c = { total: state.tasks.length, queued: 0, running: 0, success: 0, failed: 0, needsOtp: 0, skipped: 0 }
  for (const t of state.tasks) {
    if (t.status === 'QUEUED') c.queued++
    else if (t.status === 'RUNNING' || t.status === 'RETRYING') c.running++
    else if (t.status === 'SUCCESS') c.success++
    else if (t.status === 'FAILED') c.failed++
    else if (t.status === 'NEEDS_OTP') c.needsOtp++
    else if (t.status === 'SKIPPED') c.skipped++
  }
  state.run.counts = c

  const done = c.success + c.failed + c.needsOtp + c.skipped
  const elapsedMin = elapsedMs(state) / 60_000
  state.run.ratePerMin = elapsedMin > 0 ? Number((done / elapsedMin).toFixed(1)) : 0

  const remaining = c.queued + c.running
  state.run.etaSeconds =
    state.run.status === 'RUNNING' && state.run.ratePerMin > 0 && remaining > 0
      ? Math.round((remaining / state.run.ratePerMin) * 60)
      : undefined
}

export function elapsedMs(state: RunState, now = Date.now()): number {
  const startedAt = Date.parse(state.run.startedAt)
  const end =
    state.run.finishedAt !== undefined
      ? Date.parse(state.run.finishedAt)
      : state.run.status === 'PAUSED' && state.pausedAt
        ? state.pausedAt
        : now
  return Math.max(0, end - startedAt - state.pausedMs)
}

/* ------------------------------------------------------------------ controls */

export function pause(state: RunState, now = Date.now()): RunState {
  advance(state, now)
  if (state.run.status !== 'RUNNING' && state.run.status !== 'QUEUED') return state
  state.run.status = 'PAUSED'
  state.pausedAt = now
  pushEvent(state, now, 'info', 'RUN_PAUSED', 'Run paused. Nothing new is being submitted.')
  flushEvents(state)
  return state
}

export function resume(state: RunState, now = Date.now()): RunState {
  if (state.run.status !== 'PAUSED') return state
  // The clock kept running; this is the slice that should not count.
  state.pausedMs += now - (state.pausedAt ?? now)
  state.pausedAt = undefined
  state.run.status = 'RUNNING'
  pushEvent(state, now, 'info', 'RUN_RESUMED', 'Run resumed.')
  return advance(state, now)
}

/**
 * Freeze everything and mark the remainder SKIPPED (§B6). The tasks that were still
 * queued did not fail — nothing was submitted for them — so they are skipped, and the
 * counters say so.
 */
export function stop(state: RunState, now = Date.now(), reason = 'STOPPED'): RunState {
  if (state.run.status === 'RUNNING' || state.run.status === 'QUEUED') advance(state, now)
  freezeAsStopped(state, now, reason)
  flushEvents(state)
  return state
}

/**
 * The settle half of `stop`, without the `advance` call.
 *
 * `advance` needs this when `stopOnRateLimit` trips mid-sweep, and it must not call
 * `stop` to get it: `stop` advances first, and advancing is what got us here.
 */
function freezeAsStopped(state: RunState, now: number, reason: string): RunState {
  if (
    state.run.status === 'COMPLETED' ||
    state.run.status === 'STOPPED' ||
    state.run.status === 'FAILED'
  ) {
    return state
  }

  if (state.run.status === 'PAUSED' && state.pausedAt) {
    state.pausedMs += now - state.pausedAt
    state.pausedAt = undefined
  }

  let stopped = 0
  for (const task of state.tasks) {
    if (isTerminal(task.status)) continue
    task.status = 'SKIPPED'
    task.lastMessage = 'The run was stopped before this account was submitted.'
    task.updatedAt = new Date(now).toISOString()
    stopped++
  }

  state.run.status = 'STOPPED'
  state.run.finishedAt = new Date(now).toISOString()
  recount(state)
  state.run.etaSeconds = undefined

  pushEvent(
    state,
    now,
    reason === 'RATE_LIMITED' ? 'error' : 'warn',
    reason === 'RATE_LIMITED' ? 'RUN_RATE_LIMITED' : 'RUN_STOPPED',
    reason === 'RATE_LIMITED'
      ? `The club rate-limited this run, and the profile is set to stop on that. ${stopped} accounts were not submitted.`
      : `Run stopped. ${stopped} accounts were not submitted.`,
  )
  return state
}

/* -------------------------------------------------------------- construction */

export function buildTasks(
  runId: string,
  accounts: Array<{ id: string; email: string; club: string }>,
  profile: BallotProfile,
): BallotTask[] {
  const now = new Date().toISOString()
  return accounts.map((a, i) => ({
    id: `tsk_${runId.slice(4)}_${String(i + 1).padStart(4, '0')}`,
    runId,
    accountId: a.id,
    accountEmail: a.email,
    clubId: a.club as BallotTask['clubId'],
    status: 'QUEUED' as TaskStatus,
    attempt: 0,
    maxAttempts: profile.maxRetries + 1,
    updatedAt: now,
  }))
}

export function emptyCounts(total: number): BallotRun['counts'] {
  return { total, queued: total, running: 0, success: 0, failed: 0, needsOtp: 0, skipped: 0 }
}

export const RUN_TERMINAL: RunStatus[] = ['COMPLETED', 'STOPPED', 'FAILED']

export function isRunTerminal(status: RunStatus): boolean {
  return RUN_TERMINAL.includes(status)
}
