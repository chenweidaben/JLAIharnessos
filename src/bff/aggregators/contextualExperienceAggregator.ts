/**
 * 健澜科技 jlmedaios - 场景化经验自动推荐聚合器（M118-A，依据宪法第七章）
 *
 * 面向一线医护的「场景化经验推荐」：当员工在某个具体临床动作（如开处方）下、
 * 面对特定患者上下文（科室/年龄带/合并症）时，自动从全院经验库中捞出最相关的
 * 历史经验与失败教训，叠加命中分排序后置顶呈现，避免同类错误重复发生。
 *
 * 医疗安全与隐私红线（依据宪法第七章）：
 *  - 推荐对象为全院层已脱敏经验条目（ClinicalExperience），不含患者身份标识；
 *  - staffId 仅用于审计占位，不参与任何个性化画像，不触库；
 *  - 推荐为辅助参考，不改医嘱、不强制改派诊疗方案；
 *  - 纯函数：不触库、不碰 WebSocket、零新增依赖，入参零拷贝、结果确定可单测。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 患者上下文（已脱敏，仅保留影响经验匹配的临床维度） */
export interface PatientContext {
  /** 当前科室编码，如 cardio / respiratory / general */
  dept?: string;
  /** 年龄带：pediatric / adult / geriatric */
  ageBand?: string;
  /** 性别：male / female */
  gender?: string;
  /** 当前合并症/主诊标签，用于与经验标签做命中匹配 */
  conditions?: string[];
}

/** 全院层已脱敏的临床经验条目 */
export interface ClinicalExperience {
  /** 经验唯一标识 */
  id: string;
  /** 经验标题 */
  title: string;
  /** 经验正文摘要 */
  summary?: string;
  /** 适用标签（疾病/场景/人群） */
  tags: string[];
  /** 适用的临床动作，如 prescription / triage / nursing / discharge */
  actions: string[];
  /** 适用科室编码 */
  departments: string[];
  /** 来源角色：doctor / nurse / pharma / admin */
  sourceRole: string;
  /** 是否为失败教训（教训置顶，避免重复踩坑） */
  isLesson?: boolean;
  /** 成功率 0~1 */
  successRate?: number;
  /** 被引用次数 */
  useCount?: number;
}

/** 带命中分与命中原因的推荐结果 */
export interface ScoredExperience extends ClinicalExperience {
  /** 命中分（动作/科室/合并症/教训加权累加） */
  score: number;
  /** 命中原因标签，便于前端展示「为何推荐」 */
  reasons: string[];
}

/* ------------------------------- 加权口径 ------------------------------- */

/** 临床动作命中权重（currentAction 落在经验 actions 中） */
export const ACTION_MATCH_WEIGHT = 5;
/** 科室命中权重（患者科室落在经验 departments 中） */
export const DEPT_MATCH_WEIGHT = 3;
/** 单个合并症标签命中权重 */
export const CONDITION_HIT_WEIGHT = 2;
/** 失败教训附加权重（教训优先级更高） */
export const LESSON_BONUS_WEIGHT = 2;
/** rankRelevantExperiences 默认返回条数 */
export const DEFAULT_TOP_N = 10;

/* ------------------------------ 工具函数 ------------------------------- */

/** 归一化：去空白 + 转小写，用于跨大小写的宽松匹配（依据宪法第七章） */
function normalize(value: string): string {
  return value.trim().toLowerCase();
}

/** 把查询串切分为 tokens：按空白/逗号/顿号切分，丢弃空串 */
function tokenize(query: string): string[] {
  return query
    .split(/[\s,，、;；]+/)
    .map(normalize)
    .filter(Boolean);
}

/** 排序口径：命中分降序 → 成功率降序 → 引用次数降序 → 标题字典序升序（结果确定可单测） */
function compareExperiences(a: ScoredExperience, b: ScoredExperience): number {
  if (b.score !== a.score) return b.score - a.score;
  const srA = a.successRate ?? 0;
  const srB = b.successRate ?? 0;
  if (srB !== srA) return srB - srA;
  const useA = a.useCount ?? 0;
  const useB = b.useCount ?? 0;
  if (useB !== useA) return useB - useA;
  return a.title.localeCompare(b.title, 'zh-CN');
}

/* ------------------------------ 纯函数核心 ------------------------------ */

/**
 * recommendContextualExperience：场景化经验推荐（依据宪法第七章）。
 *
 * 口径：
 *  1. allExperiences 为空 / null → 直接返回空数组（空池兜底，绝不抛错）；
 *  2. 逐条计分：
 *     - currentAction 命中经验 actions        +ACTION_MATCH_WEIGHT
 *     - patientContext.dept 命中 departments  +DEPT_MATCH_WEIGHT
 *     - patientContext.conditions 与 tags 逐条交集 +CONDITION_HIT_WEIGHT / 条
 *     - 经验为失败教训 isLesson                +LESSON_BONUS_WEIGHT
 *  3. 仅保留 score>0 的相关经验；若全部零命中（空场景兜底），则退回默认信号排序
 *     （成功率→引用次数→标题），保证任何场景下都有确定结果、不返回空白；
 *  4. staffId 仅作审计占位，不参与打分，不做个性化画像；
 *  5. 纯函数：不修改入参数组/对象，返回全新数组。
 *
 * @param staffId         当前员工工号（审计占位）
 * @param patientContext  患者脱敏上下文（可空）
 * @param currentAction    当前临床动作（如 prescription，可空）
 * @param allExperiences   全院经验池（可空）
 * @returns 按相关度排序的带分经验列表
 */
export function recommendContextualExperience(
  staffId: string,
  patientContext: PatientContext | null | undefined,
  currentAction: string | null | undefined,
  allExperiences: ClinicalExperience[] | null | undefined,
): ScoredExperience[] {
  void staffId; // 审计占位，不参与打分（依据宪法第七章）
  const pool = allExperiences ?? [];
  if (pool.length === 0) return [];

  const ctx = patientContext ?? {};
  const action = normalize(currentAction ?? '');
  const dept = normalize(ctx.dept ?? '');
  const conditions = (ctx.conditions ?? []).map(normalize).filter(Boolean);

  const scored: ScoredExperience[] = pool.map((exp) => {
    let score = 0;
    const reasons: string[] = [];

    if (action && exp.actions.some((a) => normalize(a) === action)) {
      score += ACTION_MATCH_WEIGHT;
      reasons.push('action');
    }
    if (dept && exp.departments.some((d) => normalize(d) === dept)) {
      score += DEPT_MATCH_WEIGHT;
      reasons.push('dept');
    }
    if (conditions.length) {
      const tags = exp.tags.map(normalize);
      const hits = conditions.filter((c) => tags.includes(c));
      if (hits.length > 0) {
        score += hits.length * CONDITION_HIT_WEIGHT;
        reasons.push(`condition:${hits.join('+')}`);
      }
    }
    if (exp.isLesson) {
      score += LESSON_BONUS_WEIGHT;
      reasons.push('lesson');
    }

    return { ...exp, score, reasons };
  });

  // 空场景兜底：有相关命中则只推相关项；全零命中则退回默认信号排序，不返回空白。
  const relevant = scored.filter((s) => s.score > 0);
  return (relevant.length > 0 ? relevant : scored).slice().sort(compareExperiences);
}

/**
 * rankRelevantExperiences：按查询词对经验池做相关度排序并截取 Top N（依据宪法第七章）。
 *
 * 口径：
 *  1. allExperiences 为空 → 返回空数组；
 *  2. query 分词后逐条匹配：标题包含 token +5，标签等于 token +2；
 *  3. 仅保留 score>0 的命中；空 query / 零命中（空场景兜底）时退回默认信号排序；
 *  4. topN 非法（非正有限数）时回退 DEFAULT_TOP_N；最终 slice(0, topN)；
 *  5. 纯函数：不修改入参，返回新数组。
 *
 * @param query          查询关键词（可空）
 * @param allExperiences 经验池（可空）
 * @param topN           返回条数，默认 DEFAULT_TOP_N
 * @returns 按相关度排序的带分经验列表
 */
export function rankRelevantExperiences(
  query: string | null | undefined,
  allExperiences: ClinicalExperience[] | null | undefined,
  topN: number = DEFAULT_TOP_N,
): ScoredExperience[] {
  const pool = allExperiences ?? [];
  if (pool.length === 0) return [];

  const tokens = tokenize(query ?? '');
  const scored: ScoredExperience[] = pool.map((exp) => {
    let score = 0;
    const reasons: string[] = [];
    if (tokens.length > 0) {
      const title = normalize(exp.title);
      const tags = exp.tags.map(normalize);
      for (const t of tokens) {
        if (title.includes(t)) {
          score += 5;
          reasons.push('title');
        }
        if (tags.includes(t)) {
          score += 2;
          reasons.push('tag');
        }
      }
    }
    return { ...exp, score, reasons };
  });

  const relevant = scored.filter((s) => s.score > 0);
  const ordered = (relevant.length > 0 ? relevant : scored).slice().sort(compareExperiences);

  const n = Number.isFinite(topN) && topN > 0 ? Math.floor(topN) : DEFAULT_TOP_N;
  return ordered.slice(0, n);
}

/**
 * buildDefaultContextualExperiences：确定性种子经验库（依据宪法第七章）。
 *
 * 真实环境应替换为全院 muse 持久层读取；此处使用固定种子，保证路由在无库时
 * 仍可返回可测的确定性结果。所有条目均为脱敏、已标注来源的通用经验。
 */
export function buildDefaultContextualExperiences(): ClinicalExperience[] {
  return [
    {
      id: 'EXP-PRESCR-001',
      title: '门诊抗菌药处方：老年患者肾剂量调整',
      summary: '≥65 岁或 eGFR 下降患者开具经肾排泄抗菌药时，按肌酐清除率下调剂量并复查。',
      tags: ['抗菌药', '老年', '肾功能', '处方'],
      actions: ['prescription'],
      departments: ['general', 'geriatrics'],
      sourceRole: 'doctor',
      successRate: 0.91,
      useCount: 128,
    },
    {
      id: 'EXP-PRESCR-LESSON-002',
      title: '【教训】头孢与酒精双硫仑样反应漏提醒',
      summary: '头孢类处方未书面告知用药后 7 日禁酒，发生双硫仑样反应 1 例；须加用药教育。',
      tags: ['头孢', '酒精', '用药教育', '处方'],
      actions: ['prescription'],
      departments: ['general', 'emergency'],
      sourceRole: 'pharma',
      isLesson: true,
      successRate: 0.62,
      useCount: 56,
    },
    {
      id: 'EXP-PRESCR-003',
      title: '心内科口服抗凝药处方的出血风险复核',
      summary: '华法林/利伐沙班处方前核对 INR、血小板与合并抗血小板药，高出血风险降级方案。',
      tags: ['抗凝', '出血', '华法林', '处方'],
      actions: ['prescription'],
      departments: ['cardio'],
      sourceRole: 'doctor',
      successRate: 0.87,
      useCount: 94,
    },
    {
      id: 'EXP-TRIAGE-004',
      title: '急诊胸痛分诊：快速排除主动脉夹层',
      summary: '撕裂样背痛 + 双上肢血压差增大时，优先 CT 血管成像排除夹层，不按普通心梗处理。',
      tags: ['胸痛', '夹层', '分诊', '急诊'],
      actions: ['triage'],
      departments: ['emergency', 'cardio'],
      sourceRole: 'doctor',
      successRate: 0.89,
      useCount: 73,
    },
    {
      id: 'EXP-NURSING-005',
      title: '儿科静脉穿刺固定与肿胀观察',
      summary: '小儿头皮/手背静脉穿刺后每 30 分钟巡视，肿胀渗液立即拔针并记录。',
      tags: ['儿科', '静脉', '护理', '巡视'],
      actions: ['nursing'],
      departments: ['pediatrics'],
      sourceRole: 'nurse',
      successRate: 0.95,
      useCount: 210,
    },
    {
      id: 'EXP-DISCHARGE-006',
      title: '呼吸科慢阻肺出院带药与随访安排',
      summary: '慢阻肺出院带吸入剂须演示吸入手法，2 周肺功能门诊随访，急性加重预警书面化。',
      tags: ['慢阻肺', '吸入剂', '出院', '随访'],
      actions: ['discharge'],
      departments: ['respiratory'],
      sourceRole: 'doctor',
      successRate: 0.84,
      useCount: 61,
    },
  ];
}
