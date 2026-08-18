import { proxyBulkSchema } from '@/lib/api/schemas'
import { handle, ok, readJson } from '@/lib/mock/http'
import { newId, store } from '@/lib/mock/store'
import type { Proxy } from '@/lib/types'

/** POST /proxies/bulk — paste `host:port:user:pass` lines, one per proxy. */
export async function POST(request: Request) {
  return handle(request, async () => {
    const body = await readJson(request, (v) => proxyBulkSchema.safeParse(v))
    if (!body.ok) return body.response

    const created: Proxy[] = []
    const errors: Array<{ row: number; message: string }> = []

    body.value.lines.forEach((line, i) => {
      const parts = line.trim().split(':')
      if (parts.length !== 4) {
        errors.push({ row: i + 1, message: 'Expected host:port:user:pass.' })
        return
      }
      const [host, port, username, password] = parts as [string, string, string, string]
      const portNumber = Number(port)
      if (!Number.isInteger(portNumber) || portNumber <= 0) {
        errors.push({ row: i + 1, message: `'${port}' is not a port number.` })
        return
      }

      const proxy: Proxy = {
        id: newId('prx'),
        groupId: body.value.groupId ?? 'grp_1',
        label: `${host.split('.').slice(-1)[0]}-${i + 1}`,
        host,
        port: portNumber,
        username,
        passwordMasked: '•'.repeat(Math.min(12, Math.max(8, password.length))),
        status: 'untested',
      }
      store.proxies.push(proxy)
      created.push(proxy)
    })

    return ok({ created: created.length, errors, proxies: created })
  })
}
