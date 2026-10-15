/**
 * 健澜科技 jlmedaios - 药师审方「越审越准」拦截模式聚合器（依据宪法第四章）
 *
 * 职责：
 *  - buildPharmacyAuditPattern(records)：纯函数，把散落的审方拦截记录按
 *    (药品编码, 相互作用类型) 归并为拦截模式——学习哪些药物组合最常被拦截；
 *  - rankHighRisk(patterns, threshold)：纯函数，按「频次 × 平均风险分级」打分
 *    并排序，把高频问题药物组合自动高亮预警（highlighted=true），供药师重点复核。
 *
 * 医疗安全红线（依据宪法第四章）：
 *  - 本模块只做统计归并与排序，不自动驳回处方、不替代药师签名；
 *  - 高亮预警仅作药师审方辅助参考，最终放行/拦截由药师本人判断执行；
 *  - AI 不自主改方、不替代药师承担审方责任。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/** 单条审方拦截原始记录（由药师前置审方拦截事件回流） */
export interface PharmacyAuditRecord {
  /** 药品编码（药典/院内编码） */
  drugCode: string;
  /** 相互作用类型：ddi(药物相互作用) / contraindication(禁忌) / duplicate(重复用药) 等 */
  interactionType: string;
  /** 风险分级 1-5（5 最严重） */
  riskLevel: number;
  /** 拦截发生时间（ISO 8601） */
  occurredAt: string;
}

/** 归并后的拦截模式（对应 medmuse.pharmacy_audit_pattern 一行） */
export interface PharmacyAuditPattern {
  /** 药品编码 */
  drugCode: string;
  /** 相互作用类型 */
  interactionType: string;
  /** 历史被拦截次数 */
  frequency: number;
  /** 平均风险分级（保留两位小数） */
  avgRiskLevel: number;
  /** 最近一次被拦截时间（ISO 8601） */
  lastOccurred: string;
}

/** 风险分级档位（按 avgRiskLevel 判定） */
export type RiskTier = 'critical' | 'high' | 'medium';

/** 排序后的高频风险组合 */
export interface RankedPattern extends PharmacyAuditPattern {
  /** 综合风险得分 = frequency × avgRiskLevel（越大越需重点复核） */
  riskScore: number;
  /** 是否达到高频预警阈值（自动高亮） */
  highlighted: boolean;
  /** 风险分级档位：critical(avg>=4) / high(2.5<=avg<4) / medium(avg<2.5) */
  riskTier: RiskTier;
}

/** 高频风险组合视图 */
export interface PharmacyAuditPatternView {
  /** 是否为离线演示数据 */
  demo: boolean;
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
  /** 预警阈值（frequency >= 该值视为高频问题组合） */
  threshold: number;
  /** 按风险得分降序的高频风险组合 */
  patterns: RankedPattern[];
}

/** 四舍五入到两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 纯函数：把审方拦截记录归并为拦截模式。
 * - 按 (drugCode, interactionType) 分组；
 * - frequency = 组内记录数；
 * - avgRiskLevel = 组内 riskLevel 均值（保留两位小数）；
 * - lastOccurred = 组内最大 occurredAt；
 * - 空输入返回空数组；分组顺序按 frequency 降序、avgRiskLevel 降序。
 *
 * @param records 审方拦截原始记录（可乱序、可空）
 */
export function buildPharmacyAuditPattern(records: PharmacyAuditRecord[]): PharmacyAuditPattern[] {
  const groups = new Map<string, {
    drugCode: string;
    interactionType: string;
    count: number;
    riskSum: number;
    lastTs: number;
    lastIso: string;
  }>();

  for (const r of records ?? []) {
    const key = `${r.drugCode}||${r.interactionType}`;
    const ts = Date.parse(r.occurredAt);
    const fallback = Number.isNaN(ts) ? 0 : ts;
    let g = groups.get(key);
    if (!g) {
      g = { drugCode: r.drugCode, interactionType: r.interactionType, count: 0, riskSum: 0, lastTs: -Infinity, lastIso: r.occurredAt };
      groups.set(key, g);
    }
    g.count += 1;
    g.riskSum += Number(r.riskLevel) || 0;
    if (fallback >= g.lastTs) {
      g.lastTs = fallback;
      g.lastIso = r.occurredAt;
    }
  }

  const patterns: PharmacyAuditPattern[] = [...groups.values()].map((g) => ({
    drugCode: g.drugCode,
    interactionType: g.interactionType,
    frequency: g.count,
    avgRiskLevel: round2(g.riskSum / g.count),
    lastOccurred: g.lastIso,
  }));

  return patterns.sort((a, b) =>
    b.frequency - a.frequency || b.avgRiskLevel - a.avgRiskLevel,
  );
}

/** 默认高频预警阈值：同一药物组合历史被拦截 >= 3 次即自动高亮 */
export const DEFAULT_HIGH_RISK_THRESHOLD = 3;

/** 由平均风险分级判定档位 */
function tierOf(avgRiskLevel: number): RiskTier {
  if (avgRiskLevel >= 4) return 'critical';
  if (avgRiskLevel >= 2.5) return 'high';
  return 'medium';
}

/**
 * 纯函数：对拦截模式做高频风险排序，高频问题药物组合自动高亮预警。
 *
 * - 只保留 frequency >= threshold 的组合（低于阈值的偶发组合不预警）；
 * - riskScore = frequency × avgRiskLevel（历史上既常被拦、又平均风险高的组合排最前）；
 * - highlighted = true 表示命中高频预警阈值，前端据此高亮；
 * - riskTier 按 avgRiskLevel 三档分级：critical / high / medium。
 *
 * @param patterns  buildPharmacyAuditPattern 的输出（可空）
 * @param threshold 高频预警阈值（最小 frequency），默认 3
 * @returns 按 riskScore 降序的高频风险组合列表
 */
export function rankHighRisk(
  patterns: PharmacyAuditPattern[],
  threshold: number = DEFAULT_HIGH_RISK_THRESHOLD,
): RankedPattern[] {
  const cutoff = Number(threshold) || DEFAULT_HIGH_RISK_THRESHOLD;
  const ranked: RankedPattern[] = [...(patterns ?? [])]
    .filter((p) => p.frequency >= cutoff)
    .map((p) => ({
      ...p,
      riskScore: round2(p.frequency * p.avgRiskLevel),
      highlighted: true,
      riskTier: tierOf(p.avgRiskLevel),
    }));

  return ranked.sort((a, b) =>
    b.riskScore - a.riskScore ||
    b.frequency - a.frequency ||
    b.avgRiskLevel - a.avgRiskLevel,
  );
}

/** 离线演示审方拦截记录（数据库未就绪时兜底） */
const DEMO_RECORDS: PharmacyAuditRecord[] = [
  { drugCode: 'C01AA05', interactionType: 'ddi', riskLevel: 4, occurredAt: '2026-10-13T09:10:00+08:00' },
  { drugCode: 'C01AA05', interactionType: 'ddi', riskLevel: 5, occurredAt: '2026-10-11T14:20:00+08:00' },
  { drugCode: 'C01AA05', interactionType: 'ddi', riskLevel: 4, occurredAt: '2026-10-09T08:05:00+08:00' },
  { drugCode: 'N02BE01', interactionType: 'duplicate', riskLevel: 2, occurredAt: '2026-10-12T16:40:00+08:00' },
  { drugCode: 'N02BE01', interactionType: 'duplicate', riskLevel: 3, occurredAt: '2026-10-10T11:00:00+08:00' },
  { drugCode: 'J01DD04', interactionType: 'contraindication', riskLevel: 5, occurredAt: '2026-10-14T10:30:00+08:00' },
];

/**
 * 高频风险药物组合视图：从 medmuse.pharmacy_audit_pattern 读取沉淀模式并排序高亮。
 * 数据库不可用或无沉淀时回退演示数据（demo: true），不抛错阻断药师工作台。
 *
 * @param threshold 高频预警阈值（最小 frequency），默认 3
 */
export async function listHighRiskPatterns(
  threshold: number = DEFAULT_HIGH_RISK_THRESHOLD,
): Promise<PharmacyAuditPatternView> {
  try {
    const db = getDb();
    const rows = (await db`
      SELECT drug_code, interaction_type, frequency, avg_risk_level, last_occurred
      FROM medmuse.pharmacy_audit_pattern
    `) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      throw new Error('no patterns');
    }

    const patterns: PharmacyAuditPattern[] = rows.map((r) => ({
      drugCode: String(r.drug_code),
      interactionType: String(r.interaction_type),
      frequency: Number(r.frequency) || 0,
      avgRiskLevel: Number(r.avg_risk_level) || 0,
      lastOccurred: r.last_occurred ? new Date(r.last_occurred as string).toISOString() : '',
    }));

    return {
      demo: false,
      generatedAt: new Date().toISOString(),
      threshold,
      patterns: rankHighRisk(patterns, threshold),
    };
  } catch {
    const patterns = buildPharmacyAuditPattern(DEMO_RECORDS);
    return {
      demo: true,
      generatedAt: new Date().toISOString(),
      threshold,
      patterns: rankHighRisk(patterns, threshold),
    };
  }
}
