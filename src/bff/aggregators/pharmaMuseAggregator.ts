/**
 * 健澜科技 jlmedaios - 药师 MUSE 个人审方经验聚合（M116-B）
 *
 * 依据宪法第七章 7.6（药师 Personal Agent）：
 *  - 为每位药师沉淀独立的审方经验记忆（medmuse.pharma_audit_memory）；
 *  - buildPharmaMuse 把该药师的审方记录与干预回流聚合为个人成长看板：
 *    拦截统计（totalAudits / blockedUnreasonable）、医生采纳率
 *    （adoptionRate）、高频问题药物组合 Top10（topDrugPairs）与
 *    个人审方准确率学习曲线（accuracyTrend，按日分桶）。
 *
 * 医疗安全红线（依据宪法第七章 7.6）：
 *  - 本模块只做统计归并与排序，不自动驳回处方、不替代药师签名；
 *  - 聚合口径为「记录事实」，不评判药师个人对错、不用于绩效处罚；
 *  - AI 不自主改方，最终放行/拦截由药师本人判断执行。
 *
 * 纯函数核心：不触库、无副作用、可直接单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 单条审方记录（一次处方前置审核事件；由路由从 pharma_audit_memory 塑形） */
export interface PharmaAuditRecord {
  /** 问题药物组合（脱敏后，如「华法林||阿司匹林」） */
  drugPair: string;
  /** 问题类型：ddi(相互作用) / contraindication(禁忌) / duplicate(重复用药) / dose(剂量) 等 */
  issueType: string;
  /** 是否拦截（true = 判定不合理并拦截） */
  blocked: boolean;
  /** 审方发生时间（ISO 8601） */
  createdAt: string;
}

/** 单条药师干预回流（药师提出修改建议后，医生侧的响应结局） */
export interface PharmaIntervention {
  /** 问题药物组合（与 auditRecord 对齐） */
  drugPair: string;
  /** 干预建议正文（脱敏摘要） */
  intervention: string;
  /** 结局：adopted(医生采纳) / rejected(医生坚持原方) / pending(待响应) */
  outcome: string;
  /** 干预发生时间（ISO 8601） */
  createdAt: string;
}

/** 高频问题药物组合榜单项 */
export interface DrugPairStat {
  /** 药物组合 */
  drugPair: string;
  /** 代表问题类型（取该组合首次出现的 issueType） */
  issueType: string;
  /** 该组合被审方命中次数 */
  audits: number;
  /** 其中被拦截为不合理的次数 */
  blocked: number;
  /** 拦截率 0~1（blocked / audits，保留 4 位小数） */
  blockedRate: number;
}

/** 学习曲线单点（按日分桶） */
export interface AccuracyTrendPoint {
  /** 自然日（YYYY-MM-DD，取 createdAt 前 10 位） */
  period: string;
  /** 当日审方次数 */
  audits: number;
  /** 当日拦截次数 */
  blocked: number;
  /** 当日医生采纳率 0~1（当日干预有响应时计算，无干预为 0） */
  adoptionRate: number;
}

/** buildPharmaMuse 总产出 */
export interface PharmaMuse {
  /** 累计审方总数 */
  totalAudits: number;
  /** 其中拦截的不合理处方数 */
  blockedUnreasonable: number;
  /** 医生采纳率 0~1（adopted 干预 / 全部有结局干预，保留 4 位小数；无干预为 0） */
  adoptionRate: number;
  /** 高频问题药物组合 Top10（按命中次数降序） */
  topDrugPairs: DrugPairStat[];
  /** 个人审方学习曲线（按自然日升序） */
  accuracyTrend: AccuracyTrendPoint[];
}

/* ------------------------------- 常量与工具 ------------------------------- */

/** 高频问题药物组合上榜条数 */
export const DEFAULT_TOP_PAIRS = 10;

/** 采纳结局（大小写不敏感匹配） */
const OUTCOME_ADOPTED = 'adopted';
/** 终局结局集合（pending 等未响应结局不计入采纳率分母） */
const TERMINAL_OUTCOMES = new Set(['adopted', 'rejected']);

/** 数值四舍五入到 4 位小数 */
function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

/** 取自然日键（YYYY-MM-DD）；非法时间退化为 '' 不入桶 */
function dayOf(iso: string): string {
  const s = (iso ?? '').trim();
  if (s.length < 10) return '';
  return s.slice(0, 10);
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * buildPharmaMuse：药师个人审方经验聚合总入口（依据宪法第七章 7.6）。
 *
 * 流程：
 *  1. totalAudits = 审方记录总数；blockedUnreasonable = 其中 blocked=true 的条数；
 *  2. adoptionRate = outcome=adopted 的干预数 / 全部干预数（无干预为 0）；
 *  3. topDrugPairs：按 drugPair 归并审方记录 → 命中次数 / 拦截次数 / 拦截率，
 *     按「命中次数降序 → 拦截次数降序 → 组合名字典序」三级确定性排序，截 Top10；
 *  4. accuracyTrend：审方记录与干预按自然日分桶，输出每日审方数 / 拦截数 /
 *     当日采纳率，按自然日升序排列（前端据此绘制学习曲线）。
 *
 * 纯函数：不修改入参，空输入返回结构完整的零值结果，绝不抛异常
 * （聚合口径见 7.6「只记录事实，不评判对错」）。
 *
 * @param staffId 药师工号（路由已按其过滤记录，此处仅作溯源标识）
 * @param auditRecords 该药师的审方记录（pharma_audit_memory 塑形而来）
 * @param interventions 该药师的干预回流（同表中 intervention 非空者）
 * @returns 拦截统计 / 采纳率 / Top10 药物组合 / 学习曲线四件套
 */
export function buildPharmaMuse(
  staffId: string,
  auditRecords: readonly PharmaAuditRecord[],
  interventions: readonly PharmaIntervention[],
): PharmaMuse {
  const audits = [...(auditRecords ?? [])];
  const interv = [...(interventions ?? [])];
  void staffId; // 路由已按 pharmacist_id 过滤，纯函数层记录溯源不重复过滤

  /* ---- 拦截统计 ---- */
  const totalAudits = audits.length;
  const blockedUnreasonable = audits.reduce(
    (sum, r) => sum + (r.blocked === true ? 1 : 0),
    0,
  );

  /* ---- 医生采纳率（pending 未响应不计入分母） ---- */
  const decided = interv.filter((i) =>
    TERMINAL_OUTCOMES.has((i.outcome ?? '').trim().toLowerCase()),
  );
  const adoptedCount = decided.filter(
    (i) => (i.outcome ?? '').trim().toLowerCase() === OUTCOME_ADOPTED,
  ).length;
  const adoptionRate =
    decided.length === 0 ? 0 : round4(adoptedCount / decided.length);

  /* ---- 高频问题药物组合 Top10 ---- */
  const pairGroups = new Map<string, {
    drugPair: string;
    issueType: string;
    audits: number;
    blocked: number;
  }>();
  for (const r of audits) {
    const key = (r.drugPair ?? '').trim();
    if (!key) continue;
    let g = pairGroups.get(key);
    if (!g) {
      g = { drugPair: key, issueType: (r.issueType ?? '').trim(), audits: 0, blocked: 0 };
      pairGroups.set(key, g);
    }
    g.audits += 1;
    if (r.blocked === true) g.blocked += 1;
  }
  const topDrugPairs: DrugPairStat[] = [...pairGroups.values()]
    .map((g) => ({
      drugPair: g.drugPair,
      issueType: g.issueType,
      audits: g.audits,
      blocked: g.blocked,
      blockedRate: round4(g.blocked / g.audits),
    }))
    .sort(
      (a, b) =>
        b.audits - a.audits ||
        b.blocked - a.blocked ||
        a.drugPair.localeCompare(b.drugPair),
    )
    .slice(0, DEFAULT_TOP_PAIRS);

  /* ---- 个人审方学习曲线（按自然日分桶） ---- */
  const dayMap = new Map<string, {
    audits: number;
    blocked: number;
    decided: number;
    adopted: number;
  }>();
  const bumpDay = (period: string) => {
    let d = dayMap.get(period);
    if (!d) {
      d = { audits: 0, blocked: 0, decided: 0, adopted: 0 };
      dayMap.set(period, d);
    }
    return d;
  };
  for (const r of audits) {
    const period = dayOf(r.createdAt);
    if (!period) continue;
    const d = bumpDay(period);
    d.audits += 1;
    if (r.blocked === true) d.blocked += 1;
  }
  for (const i of interv) {
    const period = dayOf(i.createdAt);
    if (!period) continue;
    const d = bumpDay(period);
    if (TERMINAL_OUTCOMES.has((i.outcome ?? '').trim().toLowerCase())) {
      d.decided += 1;
      if ((i.outcome ?? '').trim().toLowerCase() === OUTCOME_ADOPTED) d.adopted += 1;
    }
  }
  const accuracyTrend: AccuracyTrendPoint[] = [...dayMap.entries()]
    .map(([period, d]) => ({
      period,
      audits: d.audits,
      blocked: d.blocked,
      adoptionRate: d.decided === 0 ? 0 : round4(d.adopted / d.decided),
    }))
    .sort((a, b) => a.period.localeCompare(b.period));

  return { totalAudits, blockedUnreasonable, adoptionRate, topDrugPairs, accuracyTrend };
}
