/**
 * 健澜科技 jlmedaios - 输血不良反应闭环 SLA 聚合器（M182-A）
 *
 * 医疗安全红线：输血不良反应闭环必须 100%，不容有失。
 *
 * 「v5.0启动」本聚合器为纯函数层，不触库、不碰 WebSocket、不新增依赖：
 *
 *   闭环五段留痕（时间戳即状态，单调前进，杜绝状态与时间戳漂移）：
 *     上报(reported) -> 评估(assessed) -> 处置(treated) -> 记录(recorded) -> 总结(summarized) -> 闭环(closed)
 *
 *   SLA 红线（自上报时刻起算）：
 *     - 24h 倒计时：上报即自动启动 24h 闭环倒计时；
 *     - 20h 未闭环：自动提醒责任医生（REMIND_DOCTOR）；
 *     - 24h 未闭环：升级至输血科主任（ESCALATE_DIRECTOR）；
 *     - 24h 内闭环达标（CLOSED_MET），超时闭环计为闭环率风险（CLOSED_BREACH）。
 *
 * 纯函数：同一 (record, now) 必然得到同一 SLA 判定，便于单测与回放。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- SLA 常量 ------------------------------- */

/** 闭环总时限：24 小时（毫秒）。 */
export const CLOSURE_SLA_MS = 24 * 60 * 60 * 1000;
/** 提醒阈值：20 小时未闭环自动提醒责任医生（毫秒）。 */
export const REMIND_THRESHOLD_MS = 20 * 60 * 60 * 1000;
/** 升级阈值：24 小时未闭环升级至输血科主任（毫秒）。 */
export const ESCALATE_THRESHOLD_MS = 24 * 60 * 60 * 1000;

/** 闭环五段状态（closed 为终态）。 */
export type ClosureStage =
  | 'reported'
  | 'assessed'
  | 'treated'
  | 'recorded'
  | 'summarized'
  | 'closed';

/** SLA 动作：在途 / 提醒责任医生 / 升级输血科主任 / 按时闭环 / 超时闭环。 */
export type ClosureAction =
  | 'ON_TRACK'
  | 'REMIND_DOCTOR'
  | 'ESCALATE_DIRECTOR'
  | 'CLOSED_MET'
  | 'CLOSED_BREACH';

/**
 * 输血不良反应闭环留痕记录（纯数据，由上报侧/责任医生侧写入时间戳）。
 * 时间戳为空代表该段尚未完成。
 */
export interface TransfusionClosureRecord {
  transfusionId: string;
  patientId: string;
  reactionType: string;
  severity: string;
  /** 上报时间（SLA 倒计时起点，ISO8601）。 */
  reportedAt: string;
  /** 评估时间。 */
  assessedAt: string | null;
  /** 处置时间。 */
  treatedAt: string | null;
  /** 记录时间。 */
  recordedAt: string | null;
  /** 总结时间。 */
  summarizedAt: string | null;
  /** 闭环时间。 */
  closedAt: string | null;
  /** 责任医生。 */
  responsibleDoctorId: string;
}

/** 单条闭环 SLA 跟踪结果。 */
export interface ClosureSlaStatus {
  transfusionId: string;
  patientId: string;
  reactionType: string;
  severity: string;
  responsibleDoctorId: string;
  /** 当前所处闭环阶段。 */
  stage: ClosureStage;
  /** SLA 起点（上报时刻）。 */
  reportedAt: string;
  /** 提醒责任医生时刻（reportedAt + 20h）。 */
  remindAt: string;
  /** 升级/闭环截止时刻（reportedAt + 24h）。 */
  deadlineAt: string;
  /** 已用时长（毫秒）。 */
  elapsedMs: number;
  /** 距截止剩余（毫秒，负值表示已超时）。 */
  remainingMs: number;
  /** 是否已闭环。 */
  isClosed: boolean;
  /** 是否在 SLA 内闭环（未闭环为 null）。 */
  closedOnTime: boolean | null;
  /** 当前应执行的 SLA 动作。 */
  action: ClosureAction;
  /** 尚未完成的闭环段（上报之后）。 */
  missingStages: ClosureStage[];
  /** 闭环留痕完整度（0-100，五段齐全为 100）。 */
  completeness: number;
  /** 人读说明。 */
  message: string;
}

/** 闭环修复结果：在 SLA 状态之上给出补齐动作与合规判定。 */
export interface ClosureFixResult {
  status: ClosureSlaStatus;
  /** 上报->评估->处置->记录->总结 五段是否齐全。 */
  closedLoopComplete: boolean;
  /** 为达成 100% 闭环必须补齐的动作清单。 */
  requiredActions: string[];
  /** 是否为 SLA 内合规闭环（医疗安全红线达标）。 */
  slaCompliant: boolean;
}

/* ------------------------------- 纯函数 ------------------------------- */

const STAGE_ORDER: readonly ClosureStage[] = [
  'reported', 'assessed', 'treated', 'recorded', 'summarized', 'closed',
];

/**
 * 纯函数：由闭环留痕时间戳推导当前阶段。
 * 时间戳按「越后段优先级越高」短路：
 *   closedAt > summarizedAt > recordedAt > treatedAt > assessedAt > reportedAt。
 * 一旦写入后段时间戳，状态自动前进，无需单独维护状态列。
 */
export function closureState(
  r: Pick<TransfusionClosureRecord,
    | 'assessedAt' | 'treatedAt' | 'recordedAt' | 'summarizedAt' | 'closedAt'>,
): ClosureStage {
  if (r.closedAt) return 'closed';
  if (r.summarizedAt) return 'summarized';
  if (r.recordedAt) return 'recorded';
  if (r.treatedAt) return 'treated';
  if (r.assessedAt) return 'assessed';
  return 'reported';
}

/** 上报之后必须补齐的五段留痕。 */
const REQUIRED_LINKS: ReadonlyArray<{ key: 'assessedAt' | 'treatedAt' | 'recordedAt' | 'summarizedAt'; name: string }> = [
  { key: 'assessedAt', name: '评估' },
  { key: 'treatedAt', name: '处置' },
  { key: 'recordedAt', name: '记录' },
  { key: 'summarizedAt', name: '总结' },
];

/**
 * 纯函数：跟踪单条输血不良反应的闭环 SLA。
 *
 * @param record 闭环留痕记录（reportedAt 为 SLA 起点）
 * @param now    当前时刻（可注入，便于回放/测试），缺省取系统当前时刻
 *
 * 判定规则：
 *   - 已闭环：closedAt <= deadline => CLOSED_MET，否则 CLOSED_BREACH；
 *   - 未闭环且已用 >= 24h => ESCALATE_DIRECTOR（升级输血科主任）；
 *   - 未闭环且已用 >= 20h => REMIND_DOCTOR（提醒责任医生）；
 *   - 其余在途 => ON_TRACK。
 */
export function trackTransfusionClosureSLA(
  record: TransfusionClosureRecord,
  now: Date = new Date(),
): ClosureSlaStatus {
  const reportedMs = new Date(record.reportedAt).getTime();
  const nowMs = now.getTime();
  const deadlineMs = reportedMs + CLOSURE_SLA_MS;
  const remindMs = reportedMs + REMIND_THRESHOLD_MS;

  const elapsedMs = nowMs - reportedMs;
  const stage = closureState(record);

  // 五段留痕完整度：上报恒完成，每补一段 +25。
  const doneLinks = REQUIRED_LINKS.filter((l) => record[l.key] != null).length;
  const completeness = 25 + doneLinks * 25; // 25(上报) + 25*n
  const missingStages: ClosureStage[] = REQUIRED_LINKS
    .filter((l) => record[l.key] == null)
    .map((l) => STAGE_ORDER.find((s) =>
      s === (l.key === 'assessedAt' ? 'assessed'
        : l.key === 'treatedAt' ? 'treated'
          : l.key === 'recordedAt' ? 'recorded' : 'summarized'))!);

  let action: ClosureAction;
  let closedOnTime: boolean | null = null;
  let message: string;

  if (record.closedAt) {
    const closedMs = new Date(record.closedAt).getTime();
    closedOnTime = closedMs <= deadlineMs;
    if (closedOnTime) {
      action = 'CLOSED_MET';
      message = `已在 SLA 内闭环（用时 ${Math.round((closedMs - reportedMs) / 3600000)}h），闭环率红线达标`;
    } else {
      action = 'CLOSED_BREACH';
      message = `已闭环但超时 ${Math.round((closedMs - deadlineMs) / 3600000)}h，计入闭环率风险`;
    }
  } else if (elapsedMs >= ESCALATE_THRESHOLD_MS) {
    action = 'ESCALATE_DIRECTOR';
    message = `上报已 ${Math.round(elapsedMs / 3600000)}h 未闭环，立即升级至输血科主任督办`;
  } else if (elapsedMs >= REMIND_THRESHOLD_MS) {
    action = 'REMIND_DOCTOR';
    message = `上报已 ${Math.round(elapsedMs / 3600000)}h 未闭环，自动提醒责任医生 ${record.responsibleDoctorId}`;
  } else {
    action = 'ON_TRACK';
    const left = Math.max(0, Math.round((deadlineMs - nowMs) / 3600000));
    message = `闭环在途，距 24h 红线截止 ${left}h`;
  }

  return {
    transfusionId: record.transfusionId,
    patientId: record.patientId,
    reactionType: record.reactionType,
    severity: record.severity,
    responsibleDoctorId: record.responsibleDoctorId,
    stage,
    reportedAt: record.reportedAt,
    remindAt: new Date(remindMs).toISOString(),
    deadlineAt: new Date(deadlineMs).toISOString(),
    elapsedMs,
    remainingMs: deadlineMs - nowMs,
    isClosed: record.closedAt != null,
    closedOnTime,
    action,
    missingStages,
    completeness: Math.min(100, completeness),
    message,
  };
}

/**
 * 纯函数：修复输血不良反应闭环。
 *
 * 医疗安全红线要求闭环 100%：在 trackTransfusionClosureSLA 之上，校验
 * 「上报 -> 评估 -> 处置 -> 记录 -> 总结」五段是否齐全，并给出为达成合规闭环
 * 所必须补齐的动作清单（不伪造时间戳，仅指出缺口）。
 *
 * @param record 闭环留痕记录
 * @param now    当前时刻（可注入）
 */
export function fixTransfusionReactionClosure(
  record: TransfusionClosureRecord,
  now: Date = new Date(),
): ClosureFixResult {
  const status = trackTransfusionClosureSLA(record, now);

  const requiredActions: string[] = [];
  for (const link of REQUIRED_LINKS) {
    if (record[link.key] == null) {
      requiredActions.push(`补全「${link.name}」留痕（${record.transfusionId}）`);
    }
  }
  if (!record.closedAt) {
    requiredActions.push(`于 ${status.deadlineAt} 前完成闭环并总结归因`);
    if (status.action === 'REMIND_DOCTOR') {
      requiredActions.push(`立即提醒责任医生 ${record.responsibleDoctorId} 推进闭环`);
    } else if (status.action === 'ESCALATE_DIRECTOR') {
      requiredActions.push('已超时，升级输血科主任介入督办');
    }
  }

  const closedLoopComplete = record.assessedAt != null
    && record.treatedAt != null
    && record.recordedAt != null
    && record.summarizedAt != null;

  // SLA 合规 = 五段齐全 且 在 SLA 内闭环（closedOnTime === true）。
  const slaCompliant = closedLoopComplete && status.closedOnTime === true;

  return { status, closedLoopComplete, requiredActions, slaCompliant };
}

/**
 * 纯函数：批量跟踪并汇总闭环 SLA 大盘（供 GET 看板使用）。
 * 闭环率 = 合规闭环数 / 总数 × 100%；红线要求 = 100%。
 */
export function summarizeClosureSLA(
  records: TransfusionClosureRecord[],
  now: Date = new Date(),
): {
  items: ClosureSlaStatus[];
  summary: {
    total: number;
    closedCount: number;
    compliantCount: number;
    breachCount: number;
    remindCount: number;
    escalateCount: number;
    closureRatePct: number;
    redLine: string;
  };
} {
  const items = records.map((r) => trackTransfusionClosureSLA(r, now));
  const closedCount = items.filter((i) => i.isClosed).length;
  const compliantCount = items.filter((i) => i.closedOnTime === true).length;
  const breachCount = items.filter((i) => i.action === 'CLOSED_BREACH').length;
  const remindCount = items.filter((i) => i.action === 'REMIND_DOCTOR').length;
  const escalateCount = items.filter((i) => i.action === 'ESCALATE_DIRECTOR').length;
  const closureRatePct = items.length
    ? Math.round((compliantCount / items.length) * 1000) / 10
    : 100;
  return {
    items,
    summary: {
      total: items.length,
      closedCount,
      compliantCount,
      breachCount,
      remindCount,
      escalateCount,
      closureRatePct,
      redLine: '输血不良反应闭环率必须 100%，医疗安全红线不容有失',
    },
  };
}
