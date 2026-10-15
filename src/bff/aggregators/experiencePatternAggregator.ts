/**
 * 健澜科技 jlmedaios - 经验关联发现聚合器（M118-D）
 *
 * 依据宪法第七章（个人信息归属与医院数据治理）：
 *   经验规律挖掘仅对脱敏后的「条件 → 结局」标签做统计归并，
 *   不关联患者直标身份；挖掘结果仅供管理复盘参考，
 *   不自动触发诊疗、医嘱或任何管理动作。
 *
 * 职责：
 *  - discoverExperiencePatterns(allExperiences)：纯函数，把散落的历史经验按
 *    (条件, 结局) 归并为经验模式——哪些前置情境最常导向何种结局；
 *    frequency 为组合频次，confidence 为条件概率 P(结局|条件)；
 *  - listExperiencePatterns()：路由视图，从经验记忆表读取数据后调用纯函数，
 *    数据库不可用时回退演示数据（demo: true），绝不阻断管理员页面。
 *
 * 医疗安全红线（依据宪法第七章）：
 *  - 本模块只做统计归并，不写库、不触发任何自动处置；
 *  - 结果为统计规律参考，最终管理判断由责任人本人作出。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/** 单条经验记录（脱敏标签，不含患者直标身份） */
export interface ExperienceRecord {
  /** 触发条件标签：如「≥75岁卧床」「术后48h」「夜间巡视22:00-06:00」 */
  condition: string;
  /** 关联结局标签：如「跌倒」「转归良好」「压疮新发」 */
  outcome: string;
}

/** 挖掘出的一条经验模式 */
export interface ExperiencePattern {
  /** 触发条件标签 */
  condition: string;
  /** 关联结局标签 */
  outcome: string;
  /** 频次：该「条件 → 结局」组合在全部经验中出现的次数 */
  frequency: number;
  /** 置信度：P(结局 | 条件) = 组合频次 / 该条件下全部经验数，保留两位小数 */
  confidence: number;
}

/** discoverExperiencePatterns 的返回结构 */
export interface ExperiencePatternDiscovery {
  /** 按频次降序、置信度降序排列的模式列表 */
  patterns: ExperiencePattern[];
}

/** BFF 视图结构（与前端 web/src/pages/muse/Patterns 对齐） */
export interface ExperiencePatternsView {
  /** 是否为离线演示数据 */
  demo: boolean;
  /** 视图生成时间（ISO 8601） */
  generatedAt: string;
  /** 参与挖掘的经验总条数 */
  totalExperiences: number;
  /** 挖掘出的模式条数 */
  patternCount: number;
  /** 经验模式列表 */
  patterns: ExperiencePattern[];
}

/** 四舍五入到两位小数 */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/**
 * 纯函数：从历史经验中自动挖掘「条件 → 结局」关联规律。
 *
 * 口径（依据宪法第七章，最小必要统计）：
 *  - 按 (condition, outcome) 分组计数 → frequency；
 *  - 以 condition 为分母计算条件概率 P(outcome | condition) → confidence（两位小数）；
 *  - condition / outcome 任一为空白的记录跳过，不参与统计；
 *  - 空输入（null / undefined / 非数组）→ { patterns: [] }，绝不抛错；
 *  - 排序确定性：frequency 降序 → confidence 降序 → condition 字典序升序。
 *
 * @param allExperiences 历史经验记录（可乱序、可空）
 */
export function discoverExperiencePatterns(
  allExperiences: ExperienceRecord[] | null | undefined,
): ExperiencePatternDiscovery {
  const safe = Array.isArray(allExperiences) ? allExperiences : [];

  /** (condition||outcome) → 组合计数 */
  const pairCount = new Map<string, { condition: string; outcome: string; count: number }>();
  /** condition → 该条件下经验总条数（置信度分母） */
  const conditionTotal = new Map<string, number>();

  for (const e of safe) {
    const condition = (e?.condition ?? '').trim();
    const outcome = (e?.outcome ?? '').trim();
    if (!condition || !outcome) continue;

    conditionTotal.set(condition, (conditionTotal.get(condition) ?? 0) + 1);

    const key = `${condition}||${outcome}`;
    const cur = pairCount.get(key);
    if (cur) {
      cur.count += 1;
    } else {
      pairCount.set(key, { condition, outcome, count: 1 });
    }
  }

  const patterns: ExperiencePattern[] = [...pairCount.values()].map((p) => ({
    condition: p.condition,
    outcome: p.outcome,
    frequency: p.count,
    confidence: round2(p.count / (conditionTotal.get(p.condition) ?? 1)),
  }));

  patterns.sort(
    (a, b) =>
      b.frequency - a.frequency ||
      b.confidence - a.confidence ||
      a.condition.localeCompare(b.condition, 'zh-CN'),
  );

  return { patterns };
}

/** 离线演示经验库（数据库未就绪时兜底，均为脱敏标签） */
const DEMO_EXPERIENCES: ExperienceRecord[] = [
  { condition: '≥75岁卧床', outcome: '跌倒' },
  { condition: '≥75岁卧床', outcome: '跌倒' },
  { condition: '≥75岁卧床', outcome: '跌倒' },
  { condition: '≥75岁卧床', outcome: '压疮新发' },
  { condition: '术后48h', outcome: '转归良好' },
  { condition: '术后48h', outcome: '转归良好' },
  { condition: '术后48h', outcome: '谵妄' },
  { condition: '夜间巡视22:00-06:00', outcome: '跌倒' },
  { condition: '夜间巡视22:00-06:00', outcome: '管路滑脱' },
  { condition: '夜间巡视22:00-06:00', outcome: '管路滑脱' },
];

/**
 * 经验模式发现视图：从 medmuse.experience_memory 读取脱敏经验标签后挖掘规律。
 * 数据库不可用或无数据时回退演示数据（demo: true），不抛错阻断管理员页面。
 */
export async function listExperiencePatterns(): Promise<ExperiencePatternsView> {
  try {
    const db = getDb();
    const rows = (await db`
      SELECT condition_tag, outcome_tag
      FROM medmuse.experience_memory
      ORDER BY created_at DESC
      LIMIT 2000
    `) as Record<string, unknown>[];

    if (!rows || rows.length === 0) {
      throw new Error('no experience rows');
    }

    const records: ExperienceRecord[] = rows.map((r) => ({
      condition: String(r.condition_tag ?? ''),
      outcome: String(r.outcome_tag ?? ''),
    }));

    const { patterns } = discoverExperiencePatterns(records);
    return {
      demo: false,
      generatedAt: new Date().toISOString(),
      totalExperiences: records.length,
      patternCount: patterns.length,
      patterns,
    };
  } catch {
    const records = DEMO_EXPERIENCES;
    const { patterns } = discoverExperiencePatterns(records);
    return {
      demo: true,
      generatedAt: new Date().toISOString(),
      totalExperiences: records.length,
      patternCount: patterns.length,
      patterns,
    };
  }
}
