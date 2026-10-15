/**
 * 健澜科技 jlmedaios - 护士 MUSE 专属功能聚合器（M116-A）
 *
 * 依据宪法第七章 7.6（护士 Personal Agent：护理经验沉淀与风险识别闭环）：
 *   从护士本人的护理操作记忆中聚合——总护理次数（totalCare）、
 *   风险识别数（riskIdentified）、干预成功率（interventionSuccessRate）、
 *   护理技巧标签云（careSkillTags）与最近交班时间线（recentTimeline），
 *   支撑护士个人护理经验页「越用越懂这位护士」。
 *
 * 设计要点：
 *  - buildNurseMuse 为纯函数，不修改入参、不打库，便于单测与前端侧本地复用；
 *  - 聚合只到护士本人 + 科室级，不落患者直接标识符；
 *  - interventionSuccessRate 保留 4 位小数（0~1），无已知结局记录时为 0；
 *  - careSkillTags 按护理类型出现频次降序、并列按首次出现顺序，输出确定可快照。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型                                                                */
/* ------------------------------------------------------------------ */

/** 干预结局三态（与 medmuse.nurse_care_memory.outcome CHECK 一致） */
export type NurseCareOutcome = 'success' | 'failure' | 'mixed';

/**
 * 一条护理操作记录（对应 medmuse.nurse_care_memory 一行；
 * patient_dept 已脱敏到科室级，纯函数侧只读取结构化字段）。
 */
export interface NurseCareRecord {
  /** 护理类型，如「压疮预防」「跌倒评估」「管路护理」 */
  careType: string;
  /** 所在科室（脱敏到科室级，可空） */
  patientDept?: string | null;
  /** 风险等级，如 high / medium / low（可空；空表示本条未涉及风险识别） */
  riskLevel?: string | null;
  /** 干预措施摘要，如「每班翻身 q2h + 减压垫」（可空） */
  intervention?: string | null;
  /** 干预结局：成功 / 失败 / 混合（可空；空表示结局未知，不参与成功率分母） */
  outcome?: NurseCareOutcome | null;
  /** 操作时间 ISO 字符串（可空；空记录在时间线中排最后） */
  createdAt?: string | null;
}

/** 一条护士识别到的风险事件 */
export interface NurseRiskEvent {
  /** 风险等级，如 high / medium / low */
  riskLevel: string;
  /** 识别时间 ISO 字符串（可空） */
  createdAt?: string | null;
}

/** 交班时间线单条（最近护理操作，新→旧） */
export interface NurseMuseTimelineItem {
  /** 操作时间 ISO 字符串（空记录回退为空串） */
  date: string;
  /** 护理类型 */
  careType: string;
  /** 所在科室（可空） */
  dept: string | null;
  /** 风险等级（可空） */
  riskLevel: string | null;
  /** 干预措施摘要（可空） */
  intervention: string | null;
  /** 干预结局（可空） */
  outcome: NurseCareOutcome | null;
}

/**
 * 护士 MUSE 个人经验页聚合视图。
 * interventionSuccessRate 为 0~1 的小数，保留 4 位；
 * mixed 计入分母但不计入成功（与全角色 Personal Agent 口径一致）。
 */
export interface NurseMuseView {
  /** 累计护理操作数 */
  totalCare: number;
  /** 累计识别风险事件数 */
  riskIdentified: number;
  /** 干预成功率 = success / (success+failure+mixed)（0~1，4 位小数；无已知结局为 0） */
  interventionSuccessRate: number;
  /** 护理技巧标签云：按护理类型频次降序、并列按首次出现顺序去重 */
  careSkillTags: string[];
  /** 最近交班经验时间线（新→旧，最多 10 条） */
  recentTimeline: NurseMuseTimelineItem[];
}

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/** 时间线最多保留条数（交班经验一屏可读） */
const TIMELINE_LIMIT = 10;

/** roundRate：把成功率四舍五入到 4 位小数，避免浮点噪声导致快照不稳定 */
function roundRate(rate: number): number {
  return Math.round(rate * 10000) / 10000;
}

/**
 * buildNurseMuse：从护士本人的护理操作记忆构建个人经验页数据。
 *
 * 聚合口径：
 *   - totalCare           护理操作记录条数；
 *   - riskIdentified       风险事件条数（由风险流独立统计，可与护理记录解耦）；
 *   - interventionSuccessRate 已知结局中 success 占比（4 位小数；
 *                           outcome 为 null / 未知值的记录不计入分母）；
 *   - careSkillTags       careType 去重集合，按出现频次降序，
 *                           并列按首次出现顺序保留（输出确定可快照）；
 *   - recentTimeline      护理记录按 createdAt 倒序（缺失时间排最后、
 *                           保持原相对次序），取前 10 条塑形为交班经验。
 *
 * 纯函数：不修改入参；careRecords / riskEvents 为 null / undefined / 空数组时
 *   返回空视图（计数全 0、成功率 0、标签与时间线为空），不抛错。
 *
 * @param staffId     护士脱敏标识（仅入参留痕，不进聚合视图）
 * @param careRecords 护理操作记忆行
 * @param riskEvents  护士识别到的风险事件行
 */
export function buildNurseMuse(
  staffId: string,
  careRecords: NurseCareRecord[] | null | undefined,
  riskEvents: NurseRiskEvent[] | null | undefined,
): NurseMuseView {
  void staffId; // 留作入参契约（路由层按护士过滤），聚合视图不携带标识

  const records = (careRecords ?? []).filter((r): r is NurseCareRecord => !!r);

  // 1) 干预成功率：success 计数 / 已知结局计数；mixed 入分母不入分子
  let successCount = 0;
  let knownOutcomeCount = 0;
  for (const r of records) {
    if (r.outcome === 'success') {
      successCount += 1;
      knownOutcomeCount += 1;
    } else if (r.outcome === 'failure' || r.outcome === 'mixed') {
      knownOutcomeCount += 1;
    }
  }

  // 2) 护理技巧标签云：careType 频次降序，并列按首次出现顺序
  const tagCount = new Map<string, number>();
  const tagFirstOrder: string[] = [];
  const tagSeen = new Set<string>();
  for (const r of records) {
    const tag = (r.careType ?? '').trim();
    if (!tag) continue;
    tagCount.set(tag, (tagCount.get(tag) ?? 0) + 1);
    if (!tagSeen.has(tag)) {
      tagSeen.add(tag);
      tagFirstOrder.push(tag);
    }
  }
  const careSkillTags = [...tagCount.keys()].sort((a, b) => {
    const diff = (tagCount.get(b) ?? 0) - (tagCount.get(a) ?? 0);
    if (diff !== 0) return diff;
    return tagFirstOrder.indexOf(a) - tagFirstOrder.indexOf(b);
  });

  // 3) 交班时间线：按 createdAt 倒序（缺失时间排最后），取前 10 条
  const timeline: NurseMuseTimelineItem[] = records
    .map((r) => ({
      date: typeof r.createdAt === 'string' && r.createdAt ? r.createdAt : '',
      careType: (r.careType ?? '').trim(),
      dept: typeof r.patientDept === 'string' && r.patientDept.trim() ? r.patientDept.trim() : null,
      riskLevel:
        typeof r.riskLevel === 'string' && r.riskLevel.trim() ? r.riskLevel.trim() : null,
      intervention:
        typeof r.intervention === 'string' && r.intervention.trim() ? r.intervention.trim() : null,
      outcome:
        r.outcome === 'success' || r.outcome === 'failure' || r.outcome === 'mixed'
          ? r.outcome
          : null,
    }))
    .sort((a, b) => {
      if (!a.date && !b.date) return 0;
      if (!a.date) return 1;
      if (!b.date) return -1;
      return b.date.localeCompare(a.date);
    })
    .slice(0, TIMELINE_LIMIT);

  return {
    totalCare: records.length,
    riskIdentified: (riskEvents ?? []).filter((e): e is NurseRiskEvent => !!e).length,
    interventionSuccessRate:
      knownOutcomeCount > 0 ? roundRate(successCount / knownOutcomeCount) : 0,
    careSkillTags,
    recentTimeline: timeline,
  };
}
