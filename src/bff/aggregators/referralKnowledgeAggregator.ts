/**
 * 健澜科技 jlmedaios - 转诊协同知识沉淀聚合器（依据宪法第三章）
 *
 * 职责：
 *  - buildReferralKnowledge(referrals, outcomes)：纯函数，把转诊请求流与转诊结案
 *    结局按 (转诊原因 referralReason, 转出科室 fromDept, 转往科室 toDept) 归并为
 *    知识模式——哪种转诊原因/科室组合成功率最高、平均几天闭环。
 *  - recommendBestDept(patterns, reason)：纯函数，发起转诊时按转诊原因自动推荐
 *    历史最佳转往科室（跨转出科室按结案例数加权，按成功率降序、平均耗时升序）。
 *  - getReferralKnowledgeView(reason)：从 medmuse.referral_knowledge 读取沉淀并
 *    生成推荐视图；数据库不可用时回退演示数据（demo: true），不阻断转诊发起。
 *
 * 医疗安全红线（依据宪法第三章）：
 *  - 本模块只做统计归并与推荐排序，不强制改派科室、不阻断转诊申请；
 *  - 推荐科室仅作发起转诊时的辅助建议，最终转往科室由接诊医师与患方共同确认；
 *  - AI 不自主开转诊单、不替代医师签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/** 单条转诊请求记录（由转诊发起侧回流） */
export interface ReferralRecord {
  /** 转出科室，如「全科医学科」 */
  fromDept: string;
  /** 转往科室，如「心血管内科」 */
  toDept: string;
  /** 转诊原因，如「胸痛待查」 */
  referralReason: string;
}

/** 单条转诊结案结局记录 */
export interface ReferralOutcome {
  /** 转出科室 */
  fromDept: string;
  /** 转往科室 */
  toDept: string;
  /** 转诊原因 */
  referralReason: string;
  /** 本次是否成功接收并完成诊疗 */
  success: boolean;
  /** 本次转诊闭环耗时（天） */
  days: number;
}

/** 归并后的转诊知识模式（对应 medmuse.referral_knowledge 一行） */
export interface ReferralKnowledgePattern {
  /** 转出科室 */
  fromDept: string;
  /** 转往科室 */
  toDept: string;
  /** 转诊原因 */
  referralReason: string;
  /** 该组合已结案例数 */
  total: number;
  /** 该组合结案成功率（0~1） */
  successRate: number;
  /** 该组合平均闭环耗时（天） */
  avgDays: number;
}

/** 单个转往科室的推荐项（GET /api/v1/referral/knowledge 返回的推荐明细） */
export interface ReferralDeptRecommendation {
  /** 推荐的转往科室 */
  dept: string;
  /** 该科室针对本转诊原因的加权成功率（0~1） */
  successRate: number;
  /** 该科室针对本转诊原因的加权平均闭环耗时（天） */
  avgDays: number;
  /** 该科室针对本转诊原因的累计结案例数 */
  total: number;
}

/** 转诊知识推荐视图（GET /api/v1/referral/knowledge 返回的 data） */
export interface ReferralKnowledgeView {
  /** 查询的转诊原因 */
  reason: string;
  /** 推荐的转往科室（最佳在前） */
  depts: string[];
  /** 推荐明细（含成功率/平均耗时/例数） */
  recommendations: ReferralDeptRecommendation[];
  /** 是否为离线演示数据 */
  demo: boolean;
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
}

/** 四舍五入到两位小数（天数等绝对量） */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 四舍五入到四位小数（0~1 比率，保留 1/3 这类精度） */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/**
 * 纯函数：从转诊请求流与结案结局学习转诊知识模式。
 *
 * 归并口径：
 *  - 以转诊请求流 referrals 建立 (referralReason, fromDept, toDept) 组合全集，
 *    再用结案结局 outcomes 回填每个组合的成功例数与耗时累加；
 *  - total = 该组合已结案结局数；successRate = success=true 的结案数 / total（0~1）；
 *  - avgDays = 该组合全部结案 days 的均值（保留两位小数）；
 *  - 仅有请求、尚无结案结局的组合（total=0）不产生知识行；
 *  - 输出按 successRate 降序、avgDays 升序排列。
 *
 * @param referrals 转诊请求记录（可乱序、可空）
 * @param outcomes  转诊结案结局记录（可空）
 */
export function buildReferralKnowledge(
  referrals: ReferralRecord[],
  outcomes: ReferralOutcome[],
): ReferralKnowledgePattern[] {
  const keyOf = (reason: string, from: string, to: string): string => `${reason}||${from}||${to}`;

  interface Acc {
    fromDept: string;
    toDept: string;
    referralReason: string;
    total: number;
    success: number;
    daysSum: number;
  }
  const stats = new Map<string, Acc>();

  // 以转诊请求流建立组合全集（含尚未结案的组合）
  for (const r of referrals ?? []) {
    const k = keyOf(r.referralReason, r.fromDept, r.toDept);
    if (!stats.has(k)) {
      stats.set(k, {
        fromDept: r.fromDept,
        toDept: r.toDept,
        referralReason: r.referralReason,
        total: 0,
        success: 0,
        daysSum: 0,
      });
    }
  }

  // 结案结局回填成功例数与耗时
  for (const o of outcomes ?? []) {
    const k = keyOf(o.referralReason, o.fromDept, o.toDept);
    let g = stats.get(k);
    if (!g) {
      g = {
        fromDept: o.fromDept,
        toDept: o.toDept,
        referralReason: o.referralReason,
        total: 0,
        success: 0,
        daysSum: 0,
      };
      stats.set(k, g);
    }
    g.total += 1;
    if (o.success) g.success += 1;
    g.daysSum += Number(o.days) || 0;
  }

  const patterns: ReferralKnowledgePattern[] = [];
  for (const g of stats.values()) {
    if (g.total <= 0) continue;
    patterns.push({
      fromDept: g.fromDept,
      toDept: g.toDept,
      referralReason: g.referralReason,
      total: g.total,
      successRate: round4(g.success / g.total),
      avgDays: round2(g.daysSum / g.total),
    });
  }

  return patterns.sort(
    (a, b) => b.successRate - a.successRate || a.avgDays - b.avgDays,
  );
}

/**
 * 纯函数：发起转诊时按转诊原因推荐历史最佳转往科室。
 *
 *  - 从 patterns 中筛出 referralReason 命中且已结案（total>0）的模式；
 *  - 按 toDept 聚合（跨转出科室），以 total 为权重加权成功率与平均耗时；
 *  - 按加权成功率降序、加权平均耗时升序排序；
 *  - 返回排好序的转往科室名称数组（最佳在前）；无历史沉淀时返回空数组。
 *
 * @param patterns buildReferralKnowledge 的输出（可空）
 * @param reason   本次转诊原因
 * @returns 推荐的转往科室名称数组（最佳在前）
 */
export function recommendBestDept(
  patterns: ReferralKnowledgePattern[],
  reason: string,
): string[] {
  const recs = rankDeptRecommendations(patterns, reason);
  return recs.map((r) => r.dept);
}

/**
 * 纯函数：同 recommendBestDept，但返回带成功率/耗时/例数的完整推荐明细，
 * 供视图层直接展示。
 *
 * @param patterns buildReferralKnowledge 的输出（可空）
 * @param reason   本次转诊原因
 */
export function rankDeptRecommendations(
  patterns: ReferralKnowledgePattern[],
  reason: string,
): ReferralDeptRecommendation[] {
  interface Acc {
    total: number;
    successWeighted: number;
    daysWeighted: number;
  }
  const byDept = new Map<string, Acc>();

  for (const p of patterns ?? []) {
    if (p.referralReason !== reason) continue;
    if (p.total <= 0) continue;
    let d = byDept.get(p.toDept);
    if (!d) {
      d = { total: 0, successWeighted: 0, daysWeighted: 0 };
      byDept.set(p.toDept, d);
    }
    d.total += p.total;
    d.successWeighted += p.successRate * p.total;
    d.daysWeighted += p.avgDays * p.total;
  }

  const recs: ReferralDeptRecommendation[] = [];
  for (const [dept, d] of byDept) {
    if (d.total <= 0) continue;
    recs.push({
      dept,
      successRate: round4(d.successWeighted / d.total),
      avgDays: round2(d.daysWeighted / d.total),
      total: d.total,
    });
  }

  return recs.sort((a, b) => b.successRate - a.successRate || a.avgDays - b.avgDays);
}

/** 离线演示转诊请求流（数据库未就绪时兜底学习） */
const DEMO_REFERRALS: ReferralRecord[] = [
  { fromDept: '全科医学科', toDept: '心血管内科', referralReason: '胸痛待查' },
  { fromDept: '全科医学科', toDept: '呼吸与危重症医学科', referralReason: '胸痛待查' },
  { fromDept: '急诊科', toDept: '心血管内科', referralReason: '胸痛待查' },
  { fromDept: '全科医学科', toDept: '消化内科', referralReason: '腹痛待查' },
];

/** 离线演示转诊结案结局 */
const DEMO_OUTCOMES: ReferralOutcome[] = [
  { fromDept: '全科医学科', toDept: '心血管内科', referralReason: '胸痛待查', success: true, days: 2 },
  { fromDept: '急诊科', toDept: '心血管内科', referralReason: '胸痛待查', success: true, days: 3 },
  { fromDept: '全科医学科', toDept: '心血管内科', referralReason: '胸痛待查', success: true, days: 2 },
  { fromDept: '全科医学科', toDept: '呼吸与危重症医学科', referralReason: '胸痛待查', success: false, days: 5 },
  { fromDept: '全科医学科', toDept: '呼吸与危重症医学科', referralReason: '胸痛待查', success: false, days: 6 },
  { fromDept: '全科医学科', toDept: '消化内科', referralReason: '腹痛待查', success: true, days: 4 },
];

/**
 * 转诊知识推荐视图：从 medmuse.referral_knowledge 读取沉淀并生成最佳转往科室推荐。
 * 数据库不可用或无沉淀时回退演示数据（demo: true），不抛错阻断转诊发起。
 *
 * @param reason 本次转诊原因
 */
export async function getReferralKnowledgeView(reason: string): Promise<ReferralKnowledgeView> {
  try {
    const db = getDb();
    const rows = (await db`
      SELECT from_dept, to_dept, referral_reason, outcome, avg_days, success_rate
      FROM medmuse.referral_knowledge
      WHERE referral_reason = ${reason}
    `) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      throw new Error('no patterns');
    }

    const patterns: ReferralKnowledgePattern[] = rows.map((r) => ({
      fromDept: String(r.from_dept ?? ''),
      toDept: String(r.to_dept ?? ''),
      referralReason: String(r.referral_reason ?? reason),
      total: 1,
      successRate: Number(r.success_rate) || 0,
      avgDays: Number(r.avg_days) || 0,
    }));

    const recommendations = rankDeptRecommendations(patterns, reason);
    return {
      reason,
      depts: recommendations.map((r) => r.dept),
      recommendations,
      demo: false,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    const patterns = buildReferralKnowledge(DEMO_REFERRALS, DEMO_OUTCOMES);
    const recommendations = rankDeptRecommendations(patterns, reason);
    return {
      reason,
      depts: recommendations.map((r) => r.dept),
      recommendations,
      demo: true,
      generatedAt: new Date().toISOString(),
    };
  }
}
