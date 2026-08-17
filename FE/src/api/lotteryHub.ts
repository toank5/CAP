import {
  HttpTransportType,
  HubConnection,
  HubConnectionBuilder,
  HubConnectionState,
  LogLevel,
} from '@microsoft/signalr'
import type { LiveStateDto } from './lottery'
import { parseLiveState } from './lottery'

const apiBase = import.meta.env.VITE_API_BASE_URL ?? ''

/**
 * Tính URL SignalR Hub:
 *  1. Nếu VITE_API_BASE_URL được set (test trỏ BE thật / staging / production):
 *     dùng `<base>/hubs/lottery`. Áp dụng cho cả dev và prod để tránh lệch hành vi
 *     khi dev muốn test với BE deploy (proxy local không đỡ được hub nếu BE không chạy local).
 *  2. Nếu thiếu env: dev local dùng `/hubs/lottery` để Vite proxy forward về 127.0.0.1:5112;
 *     prod (FE static) cũng để relative `/hubs/lottery` cho web server (Nginx) reverse-proxy.
 */
function hubUrl(): string {
  const base = String(apiBase).replace(/\/api\/?$/i, '').replace(/\/$/, '')
  if (base) return `${base}/hubs/lottery`
  return '/hubs/lottery'
}

export type LotteryHubHandlers = {
  onLobbyCount?: (count: number) => void
  onSxdSupervisorCount?: (count: number) => void
  onDrawResult?: (data: unknown) => void
  onStatus?: (status: string) => void
  /** Nhận toàn bộ live-state khi CĐT bốc tiếp (thay thế các event rời) */
  onLiveState?: (state: LiveStateDto) => void
}

export async function connectLotteryHub(
  projectId: string,
  joinCode: string | undefined,
  handlers: LotteryHubHandlers,
): Promise<HubConnection> {
  const token = sessionStorage.getItem('accessToken') ?? ''
  if (!token) throw new Error('Chưa đăng nhập — không kết nối được sảnh realtime.')
  if (!projectId) throw new Error('Thiếu mã dự án để vào sảnh.')

  const url = hubUrl()
  const connection = new HubConnectionBuilder()
    .withUrl(url, {
      accessTokenFactory: () => sessionStorage.getItem('accessToken') ?? token,
      transport:
        HttpTransportType.WebSockets |
        HttpTransportType.ServerSentEvents |
        HttpTransportType.LongPolling,
    })
    .withAutomaticReconnect([0, 1000, 2000, 5000, 10000])
    .configureLogging(LogLevel.Information)
    .build()

  connection.on('ReceiveLobbyCount', (count: number) => handlers.onLobbyCount?.(Number(count) || 0))
  connection.on('ReceiveSxdSupervisorCount', (count: number) =>
    handlers.onSxdSupervisorCount?.(Number(count) || 0),
  )
  connection.on('ReceiveDrawResult', (data: unknown) => handlers.onDrawResult?.(data))
  connection.on('ReceiveLotteryStatus', (status: string) => handlers.onStatus?.(String(status ?? '')))
  // ReceiveLiveState: BE gửi toàn bộ live-state khi CĐT bốc tiếp / trạng thái đổi
  connection.on('ReceiveLiveState', (data: unknown) => {
    const state = parseLiveState(data)
    if (state) handlers.onLiveState?.(state)
  })

  const join = async () => {
    await connection.invoke('JoinProjectLobby', projectId, joinCode ?? null)
  }

  connection.onreconnected(() => {
    void join().catch((err) => console.warn('LotteryHub rejoin failed', err))
  })

  try {
    await connection.start()
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    const hint = apiBase
      ? `Kiểm tra BE tại ${apiBase} có endpoint /hubs/lottery và CORS cho phép ${location.origin}.`
      : `Kiểm tra API http://127.0.0.1:5112 đang chạy và mở FE tại http://127.0.0.1:5173.`
    throw new Error(`Hub ${url}: ${msg}. ${hint}`)
  }
  await join()
  return connection
}

export async function stopLotteryHub(connection: HubConnection | null) {
  if (!connection) return
  try {
    if (connection.state !== HubConnectionState.Disconnected) await connection.stop()
  } catch {
    /* ignore */
  }
}
