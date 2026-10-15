/**
 * 健澜科技 jlmedaios - 护理工作台「越用越准」风险模式聚合器（依据宪法第四章）
 *
 * 职责：
 *  - buildNursingRiskPattern(records)：纯函数，把散落的风险事件记录按
 *    (风险类型, 患者画像) 归并为风险模式——哪些患者组合/时段/病情最易出风险；
 *  - prioritizeRisks(patterns, currentPatients)：纯函数，按「历史频次 × 平均严重度
 *    × 近因衰减 × 在院画像命中」计算优先级并排序，排序随历史效果动态调整：
 *    近期反复发生的模式权重上升，陈旧模式衰减，命中当前在院同画像患者的模式上浮。
 *
 * 医疗安全红线（依据宪法第四章）：
 *  - 本模块只做统计归并与排序，不直接触发医嘱或自动护理动作；
 *  - 排序结果仅作护理巡视/人力排班的辅助参考，最终处置由责任护士本人判断执行；
 *  - AI 不自主开医嘱、不替代护士签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/** 单条风险事件原始记录（由护理工作台事件回流） */
export interface NursingRiskRecord {
  /** 病区编码 */
  wardId: string;
  /** 风险类型：fall(跌倒) / pressure_ulcer(压疮) / tube_dislodgement(管路滑脱) 等 */
  riskType: string;
  /** 患者画像标签：如「≥75岁卧床」「术后48h」「夜间22:00-06:00」 */
  patientProfile: string;
  /** 严重度 1-5 */
  severity: number;
  /** 发生时间（ISO 8601） */
  occurredAt: string;
}

/** 归并后的风险模式（对应 medmuse.nursing_risk_pattern 一行） */
export interface NursingRiskPattern {
  /** 风险类型 */
  riskType: string;
  /** 患者画像标签 */
  patientProfile: string;
  /** 历史发生次数 */
  occurrenceCount: number;
  /** 平均严重度（保留两位小数） */
  avgSeverity: number;
  /** 最近一次发生时间（ISO 8601） */
  lastOccurred: string;
}

/** 在院患者（用于画像命中，动态调整优先级） */
export interface CurrentPatient {
  /** 就诊 ID */
  visitId: string;
  /** 患者画像标签 */
  patientProfile: string;
  /** 当前关注的风险类型（可选，命中时额外加权） */
  riskType?: string;
}

/** 排序后的重点风险模式 */
export interface PrioritizedRisk extends NursingRiskPattern {
  /** 综合优先级得分（越大越优先） */
  priorityScore: number;
  /** 是否命中当前在院同画像患者 */
  matchedCurrent: boolean;
  /** 命中的在院就诊 ID 列表 */
  matchedVisits: string[];
}

/** 病区本周重点风险视图 */
export interface WardFocusRisksView {
  wardId: string;
  /** 是否为离线演示数据 */
  demo: boolean;
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
  /** 按优先级降序的重点风险模式 */
  patterns: PrioritizedRisk[];
}

/** 四舍五入到两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 纯函数：把风险事件记录归并为风险模式。
 * - 按 (riskType, patientProfile) 分组；
 * - occurrenceCount = 组内记录数；
 * - avgSeverity = 组内 severity 均值（保留两位小数）；
 * - lastOccurred = 组内最大 occurredAt；
 * - 空输入返回空数组；分组顺序按 occurrenceCount 降序、avgSeverity 降序。
 *
 * @param records 风险事件原始记录（可乱序、可空）
 */
export function buildNursingRiskPattern(records: NursingRiskRecord[]): NursingRiskPattern[] {
  const groups = new Map<string, { riskType: string; patientProfile: string; count: number; severitySum: number; lastTs: number; lastIso: string }>();

  for (const r of records ?? []) {
    const key = `${r.riskType}||${r.patientProfile}`;
    const ts = Date.parse(r.occurredAt);
    const fallback = Number.isNaN(ts) ? 0 : ts;
    let g = groups.get(key);
    if (!g) {
      g = { riskType: r.riskType, patientProfile: r.patientProfile, count: 0, severitySum: 0, lastTs: -Infinity, lastIso: r.occurredAt };
      groups.set(key, g);
    }
    g.count += 1;
    g.severitySum += Number(r.severity) || 0;
    if (fallback >= g.lastTs) {
      g.lastTs = fallback;
      g.lastIso = r.occurredAt;
    }
  }

  const patterns: NursingRiskPattern[] = [...groups.values()].map((g) => ({
    riskType: g.riskType,
    patientProfile: g.patientProfile,
    occurrenceCount: g.count,
    avgSeverity: round2(g.severitySum / g.count),
    lastOccurred: g.lastIso,
  }));

  return patterns.sort((a, b) =>
    b.occurrenceCount - a.occurrenceCount || b.avgSeverity - a.avgSeverity,
  );
}

/** 近因衰减半衰期（天）：每过 30 天权重减半 */
const RECENCY_HALF_LIFE_DAYS = 30;
/** 命中在院同画像患者时的上浮系数 */
const MATCH_BOOST = 1.5;

/**
 * 纯函数：对风险模式做优先级排序，随历史效果动态调整。
 *
 * 得分 = occurrenceCount × avgSeverity × 近因衰减因子 × 命中上浮系数：
 *  - 近因衰减因子 = 1 / (1 + daysSinceLast / 30)，近期反复发生的模式权重上升，
 *    陈旧模式自然衰减；
 *  - 命中当前在院同画像患者（patientProfile 相同，且 patient.riskType 与模式一致或未指定时）
 *    上浮 1.5 倍——历史上最易出事的组合若此刻病区里正躺着同款患者，排到最前。
 *
 * @param patterns      buildNursingRiskPattern 的输出（可空）
 * @param currentPatients 当前在院患者（可空）
 * @param now           当前时间（ISO 8601，默认 now()，便于测试注入）
 * @returns 按 priorityScore 降序的重点风险列表
 */
export function prioritizeRisks(
  patterns: NursingRiskPattern[],
  currentPatients: CurrentPatient[],
  now: string = new Date().toISOString(),
): PrioritizedRisk[] {
  const nowTs = Date.parse(now);
  const base = [...(patterns ?? [])];

  const scored: PrioritizedRisk[] = base.map((p) => {
    const matchedVisits = (currentPatients ?? [])
      .filter((pt) =>
        pt.patientProfile === p.patientProfile &&
        (!pt.riskType || pt.riskType === p.riskType),
      )
      .map((pt) => pt.visitId);
    const matched = matchedVisits.length > 0;

    const lastTs = Date.parse(p.lastOccurred);
    const days = Number.isNaN(lastTs) || Number.isNaN(nowTs)
      ? 0
      : Math.max(0, (nowTs - lastTs) / 86_400_000);
    const recencyFactor = 1 / (1 + days / RECENCY_HALF_LIFE_DAYS);

    const score = (p.occurrenceCount * p.avgSeverity) * recencyFactor * (matched ? MATCH_BOOST : 1);

    return {
      ...p,
      priorityScore: round2(score),
      matchedCurrent: matched,
      matchedVisits,
    };
  });

  return scored.sort((a, b) =>
    b.priorityScore - a.priorityScore ||
    b.occurrenceCount - a.occurrenceCount ||
    b.avgSeverity - a.avgSeverity,
  );
}

/** 离线演示风险事件（数据库未就绪时兜底） */
const DEMO_RECORDS: NursingRiskRecord[] = [
  { wardId: 'W01', riskType: 'fall', patientProfile: '≥75岁卧床', severity: 3, occurredAt: '2026-10-12T08:00:00+08:00' },
  { wardId: 'W01', riskType: 'fall', patientProfile: '≥75岁卧床', severity: 4, occurredAt: '2026-10-10T22:30:00+08:00' },
  { wardId: 'W01', riskType: 'fall', patientProfile: '≥75岁卧床', severity: 3, occurredAt: '2026-10-08T06:10:00+08:00' },
  { wardId: 'W01', riskType: 'pressure_ulcer', patientProfile: '术后48h', severity: 2, occurredAt: '2026-10-13T10:00:00+08:00' },
  { wardId: 'W01', riskType: 'pressure_ulcer', patientProfile: '术后48h', severity: 3, occurredAt: '2026-10-09T15:00:00+08:00' },
  { wardId: 'W01', riskType: 'tube_dislodgement', patientProfile: '夜间22:00-06:00', severity: 2, occurredAt: '2026-09-20T03:00:00+08:00' },
];

/** 离线演示在院患者 */
const DEMO_CURRENT: CurrentPatient[] = [
  { visitId: 'V-1001', patientProfile: '≥75岁卧床', riskType: 'fall' },
  { visitId: 'V-1002', patientProfile: '心血管慢病' },
];

/**
 * 病区本周重点风险视图：从 medmuse.nursing_risk_pattern 读取沉淀模式并排序。
 * 数据库不可用或无沉淀时回退演示数据（demo: true），不抛错阻断护理工作台。
 *
 * @param wardId 病区编码
 */
export async function listWardFocusRisks(wardId: string): Promise<WardFocusRisksView> {
  try {
    const db = getDb();
    const rows = (await db`
      SELECT risk_type, patient_profile, occurrence_count, avg_severity, last_occurred
      FROM medmuse.nursing_risk_pattern
      WHERE ward_id = ${wardId}
    `) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      throw new Error('no patterns');
    }

    const patterns: NursingRiskPattern[] = rows.map((r) => ({
      riskType: String(r.risk_type),
      patientProfile: String(r.patient_profile),
      occurrenceCount: Number(r.occurrence_count) || 0,
      avgSeverity: Number(r.avg_severity) || 0,
      lastOccurred: r.last_occurred ? new Date(r.last_occurred as string).toISOString() : '',
    }));

    return {
      wardId,
      demo: false,
      generatedAt: new Date().toISOString(),
      patterns: prioritizeRisks(patterns, []),
    };
  } catch {
    const patterns = buildNursingRiskPattern(DEMO_RECORDS.filter((r) => r.wardId === wardId || wardId === ''));
    return {
      wardId,
      demo: true,
      generatedAt: new Date().toISOString(),
      patterns: prioritizeRisks(patterns, DEMO_CURRENT),
    };
  }
}
