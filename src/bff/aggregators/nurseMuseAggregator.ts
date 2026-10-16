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

/* ================================================================== */
/* M169-C 护士 Personal Agent 深化 —— 知识图谱与Personal Agent          */
/* ------------------------------------------------------------------ */
/* 让护士个人智能体「真沉淀经验」，而非假大空：                          */
/*   recordNurseExperience  把一次护理经历结构化落记（自动脱敏）；      */
/*   buildNurseMUSEProfile   从本人经验库聚合个人知识图谱画像；          */
/*   recommendNurseCare      结合当前患者上下文，只召回本人经验做推荐；  */
/*   trackNurseGrowth       按周期回看成长轨迹，给出下阶段聚焦建议。    */
/*                                                                     */
/* 四类经验沉淀（功能口径）：                                          */
/*   risk         护理风险沉淀：不良事件 adverse_event / 隐患 hazard /   */
/*                 预防措施 prevention                                  */
/*   handoff      交班经验沉淀：重点患者 key_patient / 特殊情况          */
/*                 special_case / 注意事项 precaution                    */
/*   skill        护理技巧沉淀：操作技巧 operation / 沟通技巧           */
/*                 communication / 应急处理 emergency                     */
/*   satisfaction 患者满意度沉淀：表扬 praise / 投诉 complaint /         */
/*                 改进 improvement                                      */
/*                                                                     */
/* 隐私红线（护士经验尊重隐私、不公开他人经验）：                        */
/*   1) 落记前自动剥离手机号 / 身份证号等直接标识（patientMasked）；     */
/*   2) 经验默认 shareScope=private，仅本人知识图谱节点可见；           */
/*   3) recommendNurseCare 只接收本人经验库，知识图谱中他人节点默认      */
/*      对本人不可见——即使他人经验相关也绝不混入推荐。                   */
/* ================================================================== */

/** 经验四大类 */
export type NurseExperienceCategory = 'risk' | 'handoff' | 'skill' | 'satisfaction';

/** 经验子类型（12 个，对应功能口径三三分） */
export type NurseExperienceSubType =
  | 'adverse_event'
  | 'hazard'
  | 'prevention'
  | 'key_patient'
  | 'special_case'
  | 'precaution'
  | 'operation'
  | 'communication'
  | 'emergency'
  | 'praise'
  | 'complaint'
  | 'improvement';

/** 中文类目标签（前端直接消费，避免散落两份文案） */
export const NURSE_EXPERIENCE_CATEGORY_LABEL: Record<NurseExperienceCategory, string> = {
  risk: '护理风险沉淀',
  handoff: '交班经验沉淀',
  skill: '护理技巧沉淀',
  satisfaction: '患者满意度沉淀',
};

/** 子类型 → 所属大类（落记时由子类型反推大类） */
const SUBTYPE_CATEGORY: Record<NurseExperienceSubType, NurseExperienceCategory> = {
  adverse_event: 'risk',
  hazard: 'risk',
  prevention: 'risk',
  key_patient: 'handoff',
  special_case: 'handoff',
  precaution: 'handoff',
  operation: 'skill',
  communication: 'skill',
  emergency: 'skill',
  praise: 'satisfaction',
  complaint: 'satisfaction',
  improvement: 'satisfaction',
};

const ALL_SUBTYPES = Object.keys(SUBTYPE_CATEGORY) as NurseExperienceSubType[];

/** 各大类的兜底子类型（大类合法但子类型缺失时使用） */
const CATEGORY_DEFAULT_SUBTYPE: Record<NurseExperienceCategory, NurseExperienceSubType> = {
  risk: 'prevention',
  handoff: 'precaution',
  skill: 'operation',
  satisfaction: 'improvement',
};

/** 经验共享范围：private 仅本人可见；dept 可进科室公共经验池 */
export type NurseShareScope = 'private' | 'dept';

/**
 * 一条待落记的护理经验草稿（路由层 / 前端表单塑形后传入；
 * 全部 unknown 接收，纯函数侧逐一收敛，绝不抛错）。
 */
export interface NurseExperienceDraft {
  /** 经验大类（risk/handoff/skill/satisfaction；缺失时由子类型反推） */
  category?: unknown;
  /** 经验子类型（12 个之一；缺失时按大类兜底） */
  subType?: unknown;
  /** 经验标题，如「夜尿频患者跌倒隐患」 */
  title?: unknown;
  /** 经验详情（落记前自动剥离手机号 / 身份证等直接标识） */
  detail?: unknown;
  /** 所在科室（脱敏到科室级） */
  dept?: unknown;
  /** 风险等级 high/medium/low（可空） */
  riskLevel?: unknown;
  /** 干预结局 success/failure/mixed（可空） */
  outcome?: unknown;
  /** 经验标签（用于知识图谱节点关联与推荐召回） */
  tags?: unknown;
  /** 发生时间 ISO 串（缺失时取当前时间） */
  createdAt?: unknown;
  /** 共享范围 private/dept（缺省 private） */
  shareScope?: unknown;
}

/** 一条已结构化落记的护理经验（个人知识图谱节点） */
export interface NurseExperience {
  /** 经验节点 ID（staffId+时间+标题的确定性哈希，可快照） */
  id: string;
  /** 所属护士工号（仅归属留痕，画像视图不向外暴露他人节点） */
  staffId: string;
  category: NurseExperienceCategory;
  subType: NurseExperienceSubType;
  title: string;
  detail: string;
  dept: string | null;
  riskLevel: string | null;
  outcome: NurseCareOutcome | null;
  tags: string[];
  shareScope: NurseShareScope;
  /** 隐私：落记时是否剥离过患者直接标识 */
  patientMasked: boolean;
  /** 发生时间 ISO 串 */
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* 基础收敛                                                            */
/* ------------------------------------------------------------------ */

/** expText：unknown → trim 后字符串；null/undefined/空值返回 '' */
function expText(v: unknown): string {
  if (v == null) return '';
  if (typeof v === 'string') return v.trim();
  return String(v).trim();
}

/** expTags：unknown → 去重字符串数组（支持数组或逗号分隔串） */
function expTags(v: unknown): string[] {
  const raw: unknown[] = Array.isArray(v) ? v : [v];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of raw) {
    for (const piece of expText(item).split(/[,，、;；]/)) {
      const t = piece.trim();
      if (t && !seen.has(t)) {
        seen.add(t);
        out.push(t);
      }
    }
  }
  return out;
}

/** expOutcome：宽松收敛结局三态；非法/缺失返回 null */
function expOutcome(v: unknown): NurseCareOutcome | null {
  const s = expText(v).toLowerCase();
  if (s === 'success') return 'success';
  if (s === 'failure') return 'failure';
  if (s === 'mixed') return 'mixed';
  return null;
}

/**
 * maskDirectIdentifiers：剥离患者直接标识符（手机号 / 居民身份证号）。
 * 隐私红线 1——自由文本落记前必须过此函数，避免把手机号、身份证写进经验图谱。
 */
function maskDirectIdentifiers(text: string): { text: string; masked: boolean } {
  let masked = false;
  let out = text;
  out = out.replace(/(?<!\d)1[3-9]\d{9}(?!\d)/g, () => {
    masked = true;
    return '***手机号***';
  });
  out = out.replace(/(?<!\d)\d{17}[\dXx](?!\d)/g, () => {
    masked = true;
    return '***身份证***';
  });
  return { text: out, masked };
}

/** expId：FNV-1a 32 位 → 36 进制短 ID（同输入必得同 ID，快照可复现） */
function expId(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `exp_${(h >>> 0).toString(36)}`;
}

/* ------------------------------------------------------------------ */
/* recordNurseExperience：护理经验落记（结构化 + 脱敏）                 */
/* ------------------------------------------------------------------ */

/**
 * recordNurseExperience：把一次护理经历记录为个人知识图谱节点。
 *
 * 纯函数：不打库、不改入参、不抛错；脏值一律兜底。
 *
 * 落记口径：
 *  - 大类/子类型：子类型合法即以子类型反推大类；否则按大类兜底；
 *    两者皆非法时归为「护理技巧 · 操作技巧」；
 *  - 隐私：标题与详情统一过 maskDirectIdentifiers，patientMasked 留痕；
 *  - shareScope：缺省 'private'（仅本人图谱可见），显式传 'dept' 才入科室池；
 *  - id：staffId | createdAt | title 的确定性哈希，重复落记同一经历幂等。
 *
 * @param staffId 护士工号
 * @param draft   经验草稿（null/undefined 落记为空标题兜底节点）
 */
export function recordNurseExperience(
  staffId: string,
  draft: NurseExperienceDraft | null | undefined,
): NurseExperience {
  const d = draft ?? {};

  // 1) 大类 / 子类型互推
  const rawSub = expText(d.subType).toLowerCase();
  const rawCat = expText(d.category).toLowerCase();
  let subType: NurseExperienceSubType | null =
    (ALL_SUBTYPES as string[]).includes(rawSub) ? (rawSub as NurseExperienceSubType) : null;
  const VALID_CATS: NurseExperienceCategory[] = ['risk', 'handoff', 'skill', 'satisfaction'];
  let category: NurseExperienceCategory | null = VALID_CATS.includes(rawCat as NurseExperienceCategory)
    ? (rawCat as NurseExperienceCategory)
    : null;

  if (subType && !category) category = SUBTYPE_CATEGORY[subType];
  if (category && !subType) subType = CATEGORY_DEFAULT_SUBTYPE[category];
  if (!category || !subType) {
    category = 'skill';
    subType = 'operation';
  }

  // 2) 隐私：剥离直接标识
  const titleMasked = maskDirectIdentifiers(expText(d.title));
  const detailMasked = maskDirectIdentifiers(expText(d.detail));

  // 3) 时间：缺失取当前时刻
  const rawAt = expText(d.createdAt);
  const createdAt = rawAt || new Date().toISOString();

  // 4) 共享范围：缺省 private
  const scopeRaw = expText(d.shareScope).toLowerCase();
  const shareScope: NurseShareScope = scopeRaw === 'dept' ? 'dept' : 'private';

  const id = expId(`${expText(staffId)}|${createdAt}|${titleMasked.text}|${subType}`);

  return {
    id,
    staffId: expText(staffId),
    category,
    subType,
    title: titleMasked.text,
    detail: detailMasked.text,
    dept: expText(d.dept) || null,
    riskLevel: expText(d.riskLevel).toLowerCase() || null,
    outcome: expOutcome(d.outcome),
    tags: expTags(d.tags),
    shareScope,
    patientMasked: titleMasked.masked || detailMasked.masked,
    createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* buildNurseMUSEProfile：护士个人智能体画像（知识图谱聚合）           */
/* ------------------------------------------------------------------ */

/** 交班经验亮点（重点患者 / 特殊情况 / 注意事项，新→旧） */
export interface HandoffHighlight {
  at: string;
  subType: NurseExperienceSubType;
  title: string;
  dept: string | null;
}

/** 单标签专长 */
export interface NurseSkillTag {
  tag: string;
  count: number;
}

/** 风险闭环统计 */
export interface NurseRiskClosure {
  /** 隐患条数（hazard） */
  hazardsIdentified: number;
  /** 预防措施条数（prevention） */
  preventiveActions: number;
  /** 闭环数：某隐患之后出现了同标签的预防/成功经验 */
  closedLoops: number;
  /** closedLoops / hazardsIdentified（0~1，4 位小数；无隐患为 0） */
  closureRate: number;
}

/** 满意度画像 */
export interface NurseSatisfactionProfile {
  praise: number;
  complaint: number;
  improvement: number;
  /** praise / (praise+complaint)，0~1，4 位小数；无评价为 0 */
  praiseRate: number;
}

/** 隐私画像：让护士直观知道「我的经验默认只有我自己看得到」 */
export interface NursePrivacyProfile {
  privateCount: number;
  deptSharedCount: number;
  notice: string;
}

/** buildNurseMUSEProfile 返回的个人智能体画像 */
export interface NurseMUSEProfile {
  staffId: string;
  /** 累计沉淀经验条数 */
  totalExperiences: number;
  /** 四大类各自条数 */
  byCategory: Record<NurseExperienceCategory, number>;
  riskClosure: NurseRiskClosure;
  handoffHighlights: HandoffHighlight[];
  skillStrengths: NurseSkillTag[];
  satisfaction: NurseSatisfactionProfile;
  privacy: NursePrivacyProfile;
  /** 最近一次沉淀时间 ISO 串（无则 null） */
  lastActivityAt: string | null;
}

/** 交班亮点最多条数 */
const HANDOFF_HIGHLIGHT_LIMIT = 5;
/** 专长标签最多条数 */
const SKILL_STRENGTH_LIMIT = 8;

/** 时间升序排序键（缺失时间排最后，保持原相对次序） */
function byTimeAsc(a: NurseExperience, b: NurseExperience): number {
  if (!a.createdAt && !b.createdAt) return 0;
  if (!a.createdAt) return 1;
  if (!b.createdAt) return -1;
  return a.createdAt.localeCompare(b.createdAt);
}

/** 标签集合是否有交集 */
function tagsOverlap(a: string[], b: string[]): boolean {
  const set = new Set(b);
  return a.some((t) => set.has(t));
}

/**
 * buildNurseMUSEProfile：从护士本人经验库构建个人智能体画像。
 *
 * 纯函数：只读入参 experiences；null/undefined/脏值兜底，不抛错。
 * 隐私：画像只描述本人经验结构，不携带任何患者直接标识；
 *   privacy.notice 常驻「他人经验对本人不可见」说明。
 *
 * @param staffId     护士工号（透传进返回，便于前端标识身份）
 * @param experiences 本人经验库（recordNurseExperience 的产物集合）
 */
export function buildNurseMUSEProfile(
  staffId: string,
  experiences: NurseExperience[] | null | undefined,
): NurseMUSEProfile {
  const items = (Array.isArray(experiences) ? experiences : []).filter((e): e is NurseExperience => !!e);

  const byCategory: Record<NurseExperienceCategory, number> = {
    risk: 0,
    handoff: 0,
    skill: 0,
    satisfaction: 0,
  };
  for (const e of items) byCategory[e.category] += 1;

  const riskClosure = buildRiskClosure(items);
  const handoffHighlights = buildHandoffHighlights(items);
  const skillStrengths = buildSkillStrengths(items);
  const satisfaction = buildSatisfaction(items);

  let privateCount = 0;
  let deptSharedCount = 0;
  for (const e of items) {
    if (e.shareScope === 'dept') deptSharedCount += 1;
    else privateCount += 1;
  }

  const lastActivityAt =
    items.length === 0
      ? null
      : [...items].sort(byTimeAsc)[items.length - 1].createdAt || null;

  return {
    staffId,
    totalExperiences: items.length,
    byCategory,
    riskClosure,
    handoffHighlights,
    skillStrengths,
    satisfaction,
    privacy: {
      privateCount,
      deptSharedCount,
      notice: '护理经验默认仅本人可见；推荐只召回本人沉淀，不公开他人经验',
    },
    lastActivityAt,
  };
}

/** 风险闭环：隐患之后出现同标签的预防/成功干预，记一次闭环 */
function buildRiskClosure(items: NurseExperience[]): NurseRiskClosure {
  const sorted = [...items].sort(byTimeAsc);
  let hazardsIdentified = 0;
  let preventiveActions = 0;
  let closedLoops = 0;

  for (let i = 0; i < sorted.length; i++) {
    const cur = sorted[i];
    if (cur.subType === 'hazard') {
      hazardsIdentified += 1;
      // 同隐患之后是否出现同标签的预防措施（或成功风险干预）
      const closed = sorted.slice(i + 1).some(
        (later) =>
          (later.subType === 'prevention' || later.outcome === 'success') &&
          tagsOverlap(cur.tags, later.tags),
      );
      if (closed) closedLoops += 1;
    } else if (cur.subType === 'prevention') {
      preventiveActions += 1;
    }
  }

  return {
    hazardsIdentified,
    preventiveActions,
    closedLoops,
    closureRate: hazardsIdentified > 0 ? roundRate(closedLoops / hazardsIdentified) : 0,
  };
}

/** 交班亮点：handoff 类经验按时间倒序取前 5 */
function buildHandoffHighlights(items: NurseExperience[]): HandoffHighlight[] {
  return items
    .filter((e) => e.category === 'handoff')
    .sort(byTimeAsc)
    .reverse()
    .slice(0, HANDOFF_HIGHLIGHT_LIMIT)
    .map((e) => ({ at: e.createdAt, subType: e.subType, title: e.title, dept: e.dept }));
}

/** 专长标签：频次降序、次键字典序，限量 */
function buildSkillStrengths(items: NurseExperience[]): NurseSkillTag[] {
  const freq = new Map<string, number>();
  for (const e of items) {
    for (const t of e.tags) freq.set(t, (freq.get(t) ?? 0) + 1);
  }
  return [...freq.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => b.count - a.count || a.tag.localeCompare(b.tag, 'zh-Hans-CN'))
    .slice(0, SKILL_STRENGTH_LIMIT);
}

/** 满意度画像：表扬率 = praise / (praise + complaint) */
function buildSatisfaction(items: NurseExperience[]): NurseSatisfactionProfile {
  let praise = 0;
  let complaint = 0;
  let improvement = 0;
  for (const e of items) {
    if (e.subType === 'praise') praise += 1;
    else if (e.subType === 'complaint') complaint += 1;
    else if (e.subType === 'improvement') improvement += 1;
  }
  const denom = praise + complaint;
  return {
    praise,
    complaint,
    improvement,
    praiseRate: denom > 0 ? roundRate(praise / denom) : 0,
  };
}

/* ------------------------------------------------------------------ */
/* recommendNurseCare：护理推荐（只召回本人经验，隐私红线）            */
/* ------------------------------------------------------------------ */

/** 当前患者上下文（路由层从查询参数塑形后传入） */
export interface NursePatientContext {
  /** 科室，如「老年医学科」 */
  dept?: unknown;
  /** 风险等级 high/medium/low */
  riskLevel?: unknown;
  /** 当前问题标签，如 ['跌倒高风险','压疮']（数组或逗号分隔串均可） */
  conditions?: unknown;
}

/** 一条护理推荐 */
export interface NurseCareRecommendation {
  rank: number;
  /** 来源本人经验节点 ID */
  sourceId: string;
  category: NurseExperienceCategory;
  subType: NurseExperienceSubType;
  title: string;
  detail: string;
  dept: string | null;
  /** 匹配分（0 起，越高越优先） */
  score: number;
  /** 命中理由（说明为何召回本人这条经验） */
  reason: string;
}

/** 推荐最多条数 */
const RECOMMEND_LIMIT = 5;

/**
 * recommendNurseCare：结合当前患者上下文，从护士本人经验库召回护理建议。
 *
 * 隐私红线 3：本函数形参只有 ownExperiences——知识图谱中他人节点
 *   （即使同科室、即使经验更丰富）对本人不可见，绝不混入推荐。
 *
 * 打分口径（纯函数、可快照）：
 *   基础分 10；每个命中的患者条件标签 +8；同科室 +5；同风险等级 +4；
 *   风险预防/应急类 +6（可操作优先）；结局成功 +3、失败 -2；
 *   满意度类经验不参与护理推荐（score 记 0 直接过滤）。
 *
 * @param staffId        护士工号（透传，不参与计算）
 * @param patientContext 当前患者上下文（科室/风险/问题标签）
 * @param ownExperiences 本人经验库（null/undefined 按空集 → 空推荐）
 */
export function recommendNurseCare(
  staffId: string,
  patientContext: NursePatientContext | null | undefined,
  ownExperiences: NurseExperience[] | null | undefined,
): NurseCareRecommendation[] {
  void staffId;
  const ctx = patientContext ?? {};
  const ctxDept = expText(ctx.dept);
  const ctxRisk = expText(ctx.riskLevel).toLowerCase();
  const conditions = expTags(ctx.conditions);

  const items = (Array.isArray(ownExperiences) ? ownExperiences : []).filter(
    (e): e is NurseExperience => !!e && e.category !== 'satisfaction',
  );

  const scored = items
    .map((e) => {
      let score = 10;
      const hits: string[] = [];

      for (const cond of conditions) {
        const matched =
          e.tags.includes(cond) || e.title.includes(cond) || e.detail.includes(cond);
        if (matched) {
          score += 8;
          hits.push(cond);
        }
      }
      if (ctxDept && e.dept === ctxDept) score += 5;
      if (ctxRisk && e.riskLevel === ctxRisk) score += 4;
      if (e.subType === 'prevention' || e.subType === 'emergency') score += 6;
      else if (e.subType === 'precaution' || e.subType === 'hazard') score += 5;
      else if (e.subType === 'operation' || e.subType === 'communication') score += 4;
      if (e.outcome === 'success') score += 3;
      else if (e.outcome === 'failure') score -= 2;

      const reason = hits.length
        ? `匹配您既往「${hits.join('、')}」经验`
        : '您在该方向有沉淀，可直接复用';

      return { e, score, hits, reason };
    })
    .filter((s) => s.score > 0);

  scored.sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // 并列：时间新者优先；再并列按 ID 字典序，保证快照稳定
    const t = b.e.createdAt.localeCompare(a.e.createdAt);
    return t !== 0 ? t : a.e.id.localeCompare(b.e.id);
  });

  return scored.slice(0, RECOMMEND_LIMIT).map((s, idx) => ({
    rank: idx + 1,
    sourceId: s.e.id,
    category: s.e.category,
    subType: s.e.subType,
    title: s.e.title,
    detail: s.e.detail,
    dept: s.e.dept,
    score: s.score,
    reason: s.reason,
  }));
}

/* ------------------------------------------------------------------ */
/* trackNurseGrowth：护士成长跟踪（周期回看）                         */
/* ------------------------------------------------------------------ */

/** 统计周期（ISO 日期/时间串均可；缺省覆盖全部经验时间） */
export interface NurseGrowthPeriod {
  start?: unknown;
  end?: unknown;
}

/** 月度成长点 */
export interface NurseGrowthPoint {
  /** YYYY-MM（UTC） */
  month: string;
  total: number;
  risk: number;
  handoff: number;
  skill: number;
  satisfaction: number;
}

/** trackNurseGrowth 返回 */
export interface NurseGrowthReport {
  staffId: string;
  /** 周期内沉淀条数 */
  totalInPeriod: number;
  /** 月度成长折线（含空月，按月份升序） */
  monthly: NurseGrowthPoint[];
  /** 周期内四大类分布 */
  categoryDistribution: Record<NurseExperienceCategory, number>;
  /** 周期内风险隐患闭环率（口径同画像） */
  riskClosureRate: number;
  /** 满意度口碑走势（后半段 vs 前半段） */
  satisfactionTrend: 'up' | 'down' | 'flat';
  /** 成长里程碑（可读文案，新→旧） */
  milestones: string[];
  /** 下周期聚焦建议（最薄弱大类） */
  focusArea: string;
}

/** parseAtMs：宽松解析时间戳 → 毫秒；非法返回 NaN */
function parseAtMs(v: unknown): number {
  const s = expText(v);
  if (!s) return NaN;
  const t = Date.parse(s);
  return Number.isNaN(t) ? NaN : t;
}

/** msToMonthKey：毫秒 → UTC 'YYYY-MM' */
function msToMonthKey(ms: number): string {
  const d = new Date(ms);
  return `${d.getUTCFullYear()}-${d.getUTCMonth() + 1 < 10 ? '0' : ''}${d.getUTCMonth() + 1}`;
}

/**
 * trackNurseGrowth：按周期跟踪护士个人智能体成长轨迹。
 *
 * 纯函数：不改入参；周期 start/end 缺失时用经验时间最小/最大值兜底；
 *   无任何有效时间经验时返回空报告（不抛错）。
 *
 * @param staffId     护士工号（透传）
 * @param period      统计周期 { start?, end? }
 * @param experiences 本人经验库
 */
export function trackNurseGrowth(
  staffId: string,
  period: NurseGrowthPeriod | null | undefined,
  experiences: NurseExperience[] | null | undefined,
): NurseGrowthReport {
  const all = (Array.isArray(experiences) ? experiences : []).filter((e): e is NurseExperience => !!e);

  // 1) 塑形 + 过滤有效时间
  const items = all
    .map((e) => ({ e, ms: parseAtMs(e.createdAt) }))
    .filter((x) => !Number.isNaN(x.ms))
    .sort((a, b) => a.ms - b.ms);

  const empty: NurseGrowthReport = {
    staffId,
    totalInPeriod: 0,
    monthly: [],
    categoryDistribution: { risk: 0, handoff: 0, skill: 0, satisfaction: 0 },
    riskClosureRate: 0,
    satisfactionTrend: 'flat',
    milestones: [],
    focusArea: '多记录护理经历，让个人智能体越用越懂你',
  };
  if (items.length === 0) return empty;

  // 2) 解析区间
  let startMs = parseAtMs(period?.start);
  let endMs = parseAtMs(period?.end);
  if (Number.isNaN(startMs)) startMs = items[0].ms;
  if (Number.isNaN(endMs)) endMs = items[items.length - 1].ms;
  if (startMs > endMs) [startMs, endMs] = [endMs, startMs];

  const inPeriod = items.filter((x) => x.ms >= startMs && x.ms <= endMs);
  if (inPeriod.length === 0) return { ...empty, staffId };

  // 3) 月度分桶（含空月）
  const monthly = buildGrowthMonthly(inPeriod, startMs, endMs);

  // 4) 大类分布
  const categoryDistribution: Record<NurseExperienceCategory, number> = {
    risk: 0,
    handoff: 0,
    skill: 0,
    satisfaction: 0,
  };
  for (const x of inPeriod) categoryDistribution[x.e.category] += 1;

  // 5) 周期内风险闭环率
  const closure = buildRiskClosure(inPeriod.map((x) => x.e));

  // 6) 满意度走势：周期内 praise/complaint 前后半段比较
  const satisfactionTrend = buildSatisfactionTrend(inPeriod.map((x) => x.e));

  // 7) 里程碑
  const milestones = buildGrowthMilestones(inPeriod.map((x) => x.e));

  // 8) 聚焦建议：最薄弱大类
  const focusArea = buildFocusArea(categoryDistribution);

  return {
    staffId,
    totalInPeriod: inPeriod.length,
    monthly,
    categoryDistribution,
    riskClosureRate: closure.closureRate,
    satisfactionTrend,
    milestones,
    focusArea,
  };
}

/** 月度分桶：start 月 → end 月逐月预生成，周期内经验累加到对应月 */
function buildGrowthMonthly(
  items: Array<{ e: NurseExperience; ms: number }>,
  startMs: number,
  endMs: number,
): NurseGrowthPoint[] {
  const buckets = new Map<string, NurseGrowthPoint>();
  let cursor = new Date(startMs);
  cursor.setUTCDate(1);
  const endMonth = new Date(endMs);
  let guard = 0;
  while (cursor.getTime() <= endMs && guard < 1200) {
    const key = msToMonthKey(cursor.getTime());
    buckets.set(key, { month: key, total: 0, risk: 0, handoff: 0, skill: 0, satisfaction: 0 });
    cursor.setUTCMonth(cursor.getUTCMonth() + 1);
    guard += 1;
  }
  // 若 endMs 所在月尚未生成（endMs 早于当月 1 号罕见），补一个
  const endKey = msToMonthKey(endMs);
  if (!buckets.has(endKey)) {
    buckets.set(endKey, { month: endKey, total: 0, risk: 0, handoff: 0, skill: 0, satisfaction: 0 });
  }

  for (const x of items) {
    const key = msToMonthKey(x.ms);
    const b = buckets.get(key);
    if (!b) continue;
    b.total += 1;
    b[x.e.category] += 1;
  }
  return [...buckets.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** 满意度走势：周期内评价类经验按时间均分前后两段，比较 praise 占比 */
function buildSatisfactionTrend(items: NurseExperience[]): NurseGrowthReport['satisfactionTrend'] {
  const evals = items.filter((e) => e.subType === 'praise' || e.subType === 'complaint');
  if (evals.length === 0) return 'flat';
  const mid = Math.ceil(evals.length / 2);
  const rate = (arr: NurseExperience[]): number => {
    const praise = arr.filter((e) => e.subType === 'praise').length;
    return arr.length > 0 ? praise / arr.length : 0;
  };
  const delta = rate(evals.slice(mid)) - rate(evals.slice(0, mid));
  if (delta > 0.0001) return 'up';
  if (delta < -0.0001) return 'down';
  return 'flat';
}

/** 成长里程碑：首条风险经验 / 首次隐患闭环 / 累计 10 条 / 首次表扬 */
function buildGrowthMilestones(items: NurseExperience[]): string[] {
  const out: string[] = [];
  if (items.some((e) => e.category === 'risk')) {
    out.push('已开始沉淀护理风险经验（不良事件 / 隐患 / 预防措施）');
  }
  const closure = buildRiskClosure(items);
  if (closure.closedLoops > 0) {
    out.push(`隐患闭环 ${closure.closedLoops} 次：识别风险后完成了同标签预防`);
  }
  if (items.length >= 10) {
    out.push(`周期内沉淀经验 ${items.length} 条，个人知识图谱初具规模`);
  }
  if (items.some((e) => e.subType === 'praise')) {
    out.push('收到患者表扬，沟通与照护得到正向反馈');
  }
  return out;
}

/** 聚焦建议：找周期内条数最少的大类，给出一句话成长方向 */
function buildFocusArea(dist: Record<NurseExperienceCategory, number>): string {
  const order: NurseExperienceCategory[] = ['risk', 'handoff', 'skill', 'satisfaction'];
  const weakest = [...order].sort((a, b) => dist[a] - dist[b])[0];
  const hint: Record<NurseExperienceCategory, string> = {
    risk: '护理风险沉淀偏少，建议主动记录不良事件与隐患、补齐预防措施',
    handoff: '交班经验沉淀偏少，建议把重点患者与特殊情况写成可交班的注意事项',
    skill: '护理技巧沉淀偏少，建议把操作 / 沟通 / 应急心得随手记下来',
    satisfaction: '满意度反馈沉淀偏少，建议把表扬与投诉转化为改进项',
  };
  return hint[weakest];
}
