/**
 * 健澜科技 jlmedaios - 手术安全学习引擎聚合器（依据宪法第四章）
 *
 * 职责：
 *  - buildSurgerySafetyPattern(checklists, outcomes)：纯函数，把手术安全核查表的
 *    执行记录与术后结局按 (术式, 风险点) 归并为风险模式——哪些术式在术前准备阶段
 *    最易出问题；同时统计同类术式平均术前准备时长与术后并发症率。
 *  - prepRiskReminder(surgeryType, patterns)：纯函数，术前开台时自动拼出该术式的
 *    历史风险点提醒文案，供 Time-out 环节展示。
 *  - getPreopSafetyReminder(surgeryType)：从 medmuse.surgery_safety_pattern 读取沉淀
 *    模式并生成提醒；数据库不可用时回退演示数据（demo: true），不阻断术前流程。
 *
 * 医疗安全红线（依据宪法第四章）：
 *  - 本模块只做统计归并与文案拼装，不直接拦截手术或自动改准备医嘱；
 *  - 术前提醒仅作 Time-out 环节的辅助复核参考，最终开台决策由术者本人判断执行；
 *  - AI 不自主开医嘱、不替代术者签名。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/** 单条手术安全核查执行记录（由每台手术的核查表回流） */
export interface SurgeryChecklistRecord {
  /** 术式名称，如「腹腔镜胆囊切除术」 */
  surgeryType: string;
  /** 本次核查中出现偏差/警示的风险点清单（空数组 = 本次无偏差），如「术前抗生素超时」 */
  riskFactors: string[];
  /** 本次术前准备耗时（分钟） */
  prepMinutes: number;
}

/** 单台手术术后结局记录 */
export interface SurgeryOutcomeRecord {
  /** 术式名称 */
  surgeryType: string;
  /** 本次是否发生并发症 */
  complication: boolean;
}

/** 归并后的术式风险模式（对应 medmuse.surgery_safety_pattern 一行） */
export interface SurgerySafetyPattern {
  /** 术式名称 */
  surgeryType: string;
  /** 风险点（核查表偏差项） */
  riskFactor: string;
  /** 该风险点在同类术式核查中出现偏差的比例（0~1） */
  occurrenceRate: number;
  /** 同类术式平均术前准备时长（分钟） */
  avgPrepMinutes: number;
  /** 同类术式术后并发症发生率（0~1） */
  complicationRate: number;
}

/** 术前提醒视图（GET /api/v1/surgery/safety-patterns 返回的 data） */
export interface PreopSafetyReminderView {
  /** 查询的术式 */
  surgeryType: string;
  /** 拼好的术前提醒文案 */
  reminder: string;
  /** 该术式命中的历史风险模式（按发生率降序） */
  patterns: SurgerySafetyPattern[];
  /** 是否为离线演示数据 */
  demo: boolean;
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
}

/** 四舍五入到两位小数（分钟等绝对量） */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 四舍五入到四位小数（0~1 比率，保留 1/3 这类精度） */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** 比率 0~1 格式化为百分比文案，如 0.6 -> "60.0%" */
function fmtPct(r: number): string {
  return `${(r * 100).toFixed(1)}%`;
}

/** 术前提醒最多列出的风险点条数（超出部分以「等」收束） */
const MAX_REMINDER_FACTORS = 3;

/**
 * 纯函数：从核查表执行记录与术后结局学习术式风险模式。
 *
 * 归并口径：
 *  - 按 surgeryType 分组；某术式的核查表总数 total = 该术式核查记录条数；
 *  - occurrenceRate = 出现过该 riskFactor 的核查表数 / total（0~1）；
 *  - avgPrepMinutes = 该术式全部核查记录 prepMinutes 的均值（保留两位小数）；
 *  - complicationRate = 该术式术后结局中 complication=true 的比例（0~1），
 *    无结局记录时记 0；
 *  - 每个 (surgeryType, riskFactor) 组合输出一行，行上冗余携带该术式的
 *    avgPrepMinutes / complicationRate；空输入或某术式无核查记录均不产生行；
 *  - 输出按 occurrenceRate 降序、complicationRate 降序。
 *
 * @param checklists 手术安全核查执行记录（可乱序、可空）
 * @param outcomes   术后结局记录（可空）
 */
export function buildSurgerySafetyPattern(
  checklists: SurgeryChecklistRecord[],
  outcomes: SurgeryOutcomeRecord[],
): SurgerySafetyPattern[] {
  // 按术式聚合核查表：总数、准备时长累加、各风险点命中次数
  const byType = new Map<string, { total: number; prepSum: number; factorCounts: Map<string, number> }>();

  for (const c of checklists ?? []) {
    let g = byType.get(c.surgeryType);
    if (!g) {
      g = { total: 0, prepSum: 0, factorCounts: new Map() };
      byType.set(c.surgeryType, g);
    }
    g.total += 1;
    g.prepSum += Number(c.prepMinutes) || 0;
    for (const f of c.riskFactors ?? []) {
      if (!f) continue;
      g.factorCounts.set(f, (g.factorCounts.get(f) ?? 0) + 1);
    }
  }

  // 按术式聚合结局：并发症率
  const outcomeByType = new Map<string, { total: number; complication: number }>();
  for (const o of outcomes ?? []) {
    let g = outcomeByType.get(o.surgeryType);
    if (!g) {
      g = { total: 0, complication: 0 };
      outcomeByType.set(o.surgeryType, g);
    }
    g.total += 1;
    if (o.complication) g.complication += 1;
  }

  const patterns: SurgerySafetyPattern[] = [];
  for (const [surgeryType, g] of byType) {
    if (g.total <= 0) continue;
    const avgPrep = round2(g.prepSum / g.total);
    const oc = outcomeByType.get(surgeryType);
    const compRate = oc && oc.total > 0 ? round4(oc.complication / oc.total) : 0;

    for (const [riskFactor, count] of g.factorCounts) {
      patterns.push({
        surgeryType,
        riskFactor,
        occurrenceRate: round4(count / g.total),
        avgPrepMinutes: avgPrep,
        complicationRate: compRate,
      });
    }
  }

  return patterns.sort(
    (a, b) => b.occurrenceRate - a.occurrenceRate || b.complicationRate - a.complicationRate,
  );
}

/**
 * 纯函数：术前自动展示该术式的历史风险点。
 *
 *  - 从 patterns 中筛出 surgeryType 命中的模式，按发生率降序取前 3 条；
 *  - 拼成一条 Time-out 环节可读的提醒文案：列出风险点及其历史发生率，
 *    并给出该术式平均术前准备时长与并发症率；
 *  - 无历史沉淀时返回安抚性提示，按常规流程准备即可。
 *
 * @param surgeryType 术前术式名称
 * @param patterns   buildSurgerySafetyPattern 的输出（可空）
 * @returns 供前端直接展示的提醒文案
 */
export function prepRiskReminder(surgeryType: string, patterns: SurgerySafetyPattern[]): string {
  const matched = (patterns ?? [])
    .filter((p) => p.surgeryType === surgeryType)
    .sort((a, b) => b.occurrenceRate - a.occurrenceRate || b.complicationRate - a.complicationRate);

  if (matched.length === 0) {
    return `【术前风险提示】${surgeryType} 暂无历史风险点沉淀，按常规术前核查流程准备即可。`;
  }

  const top = matched.slice(0, MAX_REMINDER_FACTORS);
  const factorText = top.map((p) => `${p.riskFactor}（${fmtPct(p.occurrenceRate)}）`).join('、');
  const more = matched.length > MAX_REMINDER_FACTORS ? ' 等' : '';

  return (
    `【术前风险提示】${surgeryType} 历史风险点：${factorText}${more}；` +
    `平均术前准备 ${matched[0].avgPrepMinutes} 分钟，并发症率 ${fmtPct(matched[0].complicationRate)}。` +
    `请在 Time-out 环节重点复核。`
  );
}

/** 离线演示核查记录（数据库未就绪时兜底学习） */
const DEMO_CHECKLISTS: SurgeryChecklistRecord[] = [
  { surgeryType: '腹腔镜胆囊切除术', riskFactors: ['术前抗生素超时'], prepMinutes: 50 },
  { surgeryType: '腹腔镜胆囊切除术', riskFactors: ['术前抗生素超时', '电刀负极板位置不当'], prepMinutes: 65 },
  { surgeryType: '腹腔镜胆囊切除术', riskFactors: ['术前抗生素超时'], prepMinutes: 45 },
  { surgeryType: '腹腔镜胆囊切除术', riskFactors: [], prepMinutes: 40 },
  { surgeryType: '腹腔镜胆囊切除术', riskFactors: ['电刀负极板位置不当'], prepMinutes: 55 },
  { surgeryType: '全髋关节置换术', riskFactors: ['抗生素骨水泥准备延误'], prepMinutes: 90 },
  { surgeryType: '全髋关节置换术', riskFactors: ['抗生素骨水泥准备延误'], prepMinutes: 100 },
  { surgeryType: '全髋关节置换术', riskFactors: [], prepMinutes: 80 },
];

/** 离线演示术后结局 */
const DEMO_OUTCOMES: SurgeryOutcomeRecord[] = [
  { surgeryType: '腹腔镜胆囊切除术', complication: true },
  { surgeryType: '腹腔镜胆囊切除术', complication: false },
  { surgeryType: '腹腔镜胆囊切除术', complication: false },
  { surgeryType: '腹腔镜胆囊切除术', complication: false },
  { surgeryType: '腹腔镜胆囊切除术', complication: false },
  { surgeryType: '全髋关节置换术', complication: false },
  { surgeryType: '全髋关节置换术', complication: false },
  { surgeryType: '全髋关节置换术', complication: true },
];

/**
 * 术前提醒视图：从 medmuse.surgery_safety_pattern 读取沉淀模式并生成术前提醒。
 * 数据库不可用或无沉淀时回退演示数据（demo: true），不抛错阻断术前流程。
 *
 * @param surgeryType 术前术式名称
 */
export async function getPreopSafetyReminder(surgeryType: string): Promise<PreopSafetyReminderView> {
  try {
    const db = getDb();
    const rows = (await db`
      SELECT surgery_type, risk_factor, occurrence_rate, avg_prep_minutes, complication_rate
      FROM medmuse.surgery_safety_pattern
      WHERE surgery_type = ${surgeryType}
    `) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      throw new Error('no patterns');
    }

    const patterns: SurgerySafetyPattern[] = rows.map((r) => ({
      surgeryType: String(r.surgery_type),
      riskFactor: String(r.risk_factor),
      occurrenceRate: Number(r.occurrence_rate) || 0,
      avgPrepMinutes: Number(r.avg_prep_minutes) || 0,
      complicationRate: Number(r.complication_rate) || 0,
    }));

    return {
      surgeryType,
      reminder: prepRiskReminder(surgeryType, patterns),
      patterns,
      demo: false,
      generatedAt: new Date().toISOString(),
    };
  } catch {
    const patterns = buildSurgerySafetyPattern(DEMO_CHECKLISTS, DEMO_OUTCOMES);
    return {
      surgeryType,
      reminder: prepRiskReminder(surgeryType, patterns),
      patterns: patterns.filter((p) => p.surgeryType === surgeryType),
      demo: true,
      generatedAt: new Date().toISOString(),
    };
  }
}
