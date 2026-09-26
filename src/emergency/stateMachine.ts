/**
 * 健澜科技 jlmedaios - 急诊工作流状态机（M1-B1）
 *
 * 管理急诊主状态 em_status 的合法流转，纯函数、可单测。
 *
 *   waiting_triage 待分诊
 *     └→ triaged 已分诊（候诊）
 *          ├→ in_treatment 就诊中
 *          ├→ resuscitation 抢救中
 *          └→ observation 留观中
 *   resuscitation ⇄ observation（病情变化可互转）
 *   resuscitation / observation / in_treatment → 终态：
 *          admitted 入院 / transferred 转科 / discharged 离院 / deceased 死亡
 *
 * 绿色通道是“叠加态”（green_channel_active 标志 + green_channels 记录），
 * 不单独占用主状态：抢救中、留观中均可同时在绿色通道内。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */

export type EmergencyStatus =
  | 'waiting_triage'
  | 'triaged'
  | 'in_treatment'
  | 'resuscitation'
  | 'observation'
  | 'admitted'
  | 'transferred'
  | 'discharged'
  | 'deceased';

/** 终态（不可再流转） */
export const TERMINAL_STATUSES: ReadonlySet<EmergencyStatus> = new Set([
  'admitted',
  'transferred',
  'discharged',
  'deceased',
]);

/** 状态中文标签 */
export const STATUS_LABELS: Record<EmergencyStatus, string> = {
  waiting_triage: '待分诊',
  triaged: '已分诊/候诊',
  in_treatment: '就诊中',
  resuscitation: '抢救中',
  observation: '留观中',
  admitted: '已入院',
  transferred: '已转科',
  discharged: '已离院',
  deceased: '死亡',
};

/**
 * 合法流转邻接表。键为当前状态，值为可转入的状态集合。
 */
const TRANSITIONS: Record<EmergencyStatus, ReadonlySet<EmergencyStatus>> = {
  waiting_triage: new Set<EmergencyStatus>(['triaged']),
  triaged: new Set<EmergencyStatus>(['in_treatment', 'resuscitation', 'observation']),
  in_treatment: new Set<EmergencyStatus>([
    'resuscitation',
    'observation',
    'admitted',
    'transferred',
    'discharged',
    'deceased',
  ]),
  resuscitation: new Set<EmergencyStatus>([
    'observation',
    'in_treatment',
    'admitted',
    'transferred',
    'discharged',
    'deceased',
  ]),
  observation: new Set<EmergencyStatus>([
    'resuscitation',
    'in_treatment',
    'admitted',
    'transferred',
    'discharged',
    'deceased',
  ]),
  admitted: new Set<EmergencyStatus>([]),
  transferred: new Set<EmergencyStatus>([]),
  discharged: new Set<EmergencyStatus>([]),
  deceased: new Set<EmergencyStatus>([]),
};

/** 是否为终态 */
export function isTerminal(status: EmergencyStatus): boolean {
  return TERMINAL_STATUSES.has(status);
}

/** 判断从 from → to 是否为合法流转 */
export function canTransition(from: EmergencyStatus, to: EmergencyStatus): boolean {
  if (from === to) return false;
  return TRANSITIONS[from]?.has(to) ?? false;
}

/**
 * 断言流转合法，非法时抛出带说明的错误（供聚合器调用，统一转 400）。
 */
export function assertTransition(from: EmergencyStatus, to: EmergencyStatus): void {
  if (isTerminal(from)) {
    throw new StateTransitionError(
      `当前状态「${STATUS_LABELS[from]}」为终态，不能再流转到「${STATUS_LABELS[to] ?? to}」`,
    );
  }
  if (!canTransition(from, to)) {
    throw new StateTransitionError(
      `非法状态流转：${STATUS_LABELS[from] ?? from} → ${STATUS_LABELS[to] ?? to}`,
    );
  }
}

/** 状态流转错误（聚合器据此返回 400） */
export class StateTransitionError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'StateTransitionError';
  }
}

/** 某状态可转入的全部状态（供前端/测试） */
export function allowedNext(status: EmergencyStatus): EmergencyStatus[] {
  return Array.from(TRANSITIONS[status] ?? []);
}
