import { handle, ok } from '@/lib/mock/http'
import { store } from '@/lib/mock/store'

/**
 * GET /ballots/imap — the mailboxes a profile can read two-factor codes from.
 *
 * Backs the `IMAP account ▾` §B5.2 makes required when `otpSource` is `imap`, and the
 * check §B5.4 makes the launcher run before it will start a run.
 */
export async function GET(request: Request) {
  return handle(request, () => ok(store.imapAccounts))
}
