/**
 * 健澜科技数智医院智能体 - 危急值告警总线（解耦层）
 *
 * 复用现有 /ws/chat 的 broadcast 通道（critical:alert / critical:status 事件），
 * 不新建一套告警。server.ts 启动时通过 setCriticalAlertSink 注入其 broadcast。
 *
 *  - critical:alert：新危急值产生时强提醒（带稳定唯一 id，前端按 id 去重）；
 *  - critical:status：签收/处置后广播状态变更，其他客户端实时同步、关闭弹窗。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

type AlertSink = (event: string, payload: unknown) => void;

let sink: AlertSink | null = null;

/** 由 server.ts 注入真实 broadcast（同一 /ws/chat 通道） */
export function setCriticalAlertSink(fn: AlertSink | null): void {
  sink = fn;
}

/** 推送一条原始事件到现有通道（无人订阅时静默丢弃，不影响主流程） */
function emit(event: string, payload: unknown): void {
  if (!sink) return;
  try {
    sink(event, payload);
  } catch {
    /* 告警推送失败不影响业务主流程 */
  }
}

/** 兼容既有调用：推送一条影像危急值告警 payload */
export function emitCriticalRadarAlert(payload: unknown): void {
  emit('critical:alert', payload);
}

/** 构造危急值强提醒 payload 所需的字段（由 repository 的 CriticalAlert 映射而来） */
export interface CriticalValueEventInput {
  id: string;
  visitId: string;
  patientId: string;
  patientName?: string;
  department: string;
  itemName: string;
  value: string | null;
  unit: string | null;
  refLow: string | null;
  refHigh: string | null;
  status: string;
  raisedAt: string;
}

/** 构造对齐前端 Alert 契约的危急值 payload（含稳定 id 与业务字段） */
export function buildCriticalAlertPayload(a: CriticalValueEventInput): Record<string, unknown> {
  const valueText = a.value != null ? `${a.value}${a.unit ?? ''}` : a.itemName;
  const refRange =
    a.refLow != null || a.refHigh != null
      ? `（参考范围 ${a.refLow ?? '-'} ~ ${a.refHigh ?? '-'}）`
      : '';
  return {
    id: a.id,
    type: 'critical-value',
    level: 'critical',
    title: `${a.itemName}危急值`,
    content: `${a.itemName} ${valueText} 达危急值${refRange}，请立即复核并按危急值流程处置（10 分钟内处置 + 双人复核 + 系统登记）`,
    patientId: a.patientId,
    patientName: a.patientName,
    createdAt: a.raisedAt,
    acknowledged: false,
    // 业务字段（供危急值工作站使用）
    visitId: a.visitId,
    department: a.department,
    itemName: a.itemName,
    value: a.value,
    unit: a.unit,
    status: a.status,
  };
}

/** 扫描产生新危急值后推送强提醒（payload 经统一构造，id 稳定） */
export function emitCriticalValueAlert(a: CriticalValueEventInput): void {
  emit('critical:alert', buildCriticalAlertPayload(a));
}

/**
 * 签收/处置后广播状态变更（critical:status）。
 * 其他客户端据此实时同步队列状态、关闭对应强提醒弹窗。
 */
export function emitCriticalStatus(
  id: string,
  status: 'raised' | 'acked' | 'resolved',
  extra: { actedBy?: string; note?: string | null } = {},
): void {
  emit('critical:status', {
    id,
    status,
    actedBy: extra.actedBy ?? null,
    note: extra.note ?? null,
    at: new Date().toISOString(),
  });
}
