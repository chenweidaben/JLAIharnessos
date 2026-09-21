/**
 * 健澜科技数智医院智能体 - 危急值告警总线（解耦层）
 *
 * 复用现有 /ws/chat 的 broadcast 通道（critical:alert 事件），不新建一套告警。
 * server.ts 启动时通过 setCriticalAlertSink 注入其 broadcast；
 * BFF 路由/适配器在发现 critical 影像结果时调用 emitCriticalRadarAlert。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

type AlertSink = (event: string, payload: unknown) => void;

let sink: AlertSink | null = null;

/** 由 server.ts 注入真实 broadcast（同一 /ws/chat 通道） */
export function setCriticalAlertSink(fn: AlertSink | null): void {
  sink = fn;
}

/** 推送一条影像危急值告警到现有通道（无人订阅时静默丢弃，不影响主流程） */
export function emitCriticalRadarAlert(payload: unknown): void {
  if (!sink) return;
  try {
    sink('critical:alert', payload);
  } catch {
    /* 告警推送失败不影响业务主流程 */
  }
}
