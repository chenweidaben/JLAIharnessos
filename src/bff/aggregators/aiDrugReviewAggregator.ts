/**
 * 健澜科技 jlmedaios - AI 合理用药深度审核聚合器（M144-C）「AI核心能力深化」
 *
 * 在 CDS 实时审查（drugReviewAggregator）与五维深度审核（deepPrescriptionReview）
 * 之上，面向药房前置审方场景输出可留痕、可回流误拦反馈的结构化审核结论：
 *  - interaction       药物相互作用（用药清单内两两）；
 *  - contraindication  禁忌症（结合患者诊断与过敏史）；
 *  - dose              剂量合理性（单次超量 / 日累计超量）；
 *  - specialPopulation 特殊人群（儿童 / 老年）；
 *  - duplicate         重复用药（同治疗类别叠加）。
 *
 * 设计目标：审核要准确，误拦率要持续下降——
 *  - 规则库只保留证据充分的高/中风险组合，低风险仅作提示（low），不轻易拦截；
 *  - 每条告警带稳定 finding_id，供药师「误拦反馈」回流，规则据此迭代。
 *
 * 纯函数约定：deepDrugReview / getDrugReviewStats 无 I/O、确定性、对非法输入安全降级。
 * 规则库为内置轻量子集，用于演示与单测，生产环境应替换为权威药学知识库。
 * 最终用药决定由医师与药师作出（人在回路），本模块不拦截处方、不改变审批状态。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型契约（纯数据）
// ---------------------------------------------------------------------------

/** 风险三级：high 红 / medium 橙 / low 蓝（前端按此配色） */
export type RiskLevel = 'high' | 'medium' | 'low';

/** 五个审核维度 */
export type ReviewDimension =
  | 'interaction'
  | 'contraindication'
  | 'dose'
  | 'specialPopulation'
  | 'duplicate';

/** 用药条目：可只传通用名字符串，也可携带剂量供剂量计算 */
export interface DrugEntry {
  name: string;
  /** 单次剂量 mg */
  doseMg?: number | null;
  /** 每日给药次数 */
  dosesPerDay?: number | null;
}

/** 用药清单条目：兼容纯字符串（仅通用名）与结构化剂量对象 */
export type MedInput = string | DrugEntry;

/** 单条审核告警 */
export interface Finding {
  /** 稳定告警 ID（规则键+药品名），供误拦反馈按条回流 */
  id: string;
  dimension: ReviewDimension;
  level: RiskLevel;
  drug: string;
  /** 配对告警中的另一药（相互作用/重复用药） */
  relatedDrug?: string;
  title: string;
  reason: string;
  suggestion: string;
}

/** 深度审核报告 */
export interface Review {
  prescriptionId: string;
  findings: Finding[];
  /** 全方最高风险；无告警时为 none */
  overallRisk: RiskLevel | 'none';
  counts: { high: number; medium: number; low: number; total: number };
  summary: string;
  reviewedAt: string;
}

/** 药师误拦反馈留痕 */
export interface FalsePositiveFeedback {
  reviewId: string;
  findingId: string;
  reason: string;
  operator: string;
  feedbackAt: string;
  type: 'false_positive';
}

/** 统计口径：一次已落库审核的最小摘要（供 getDrugReviewStats 纯函数聚合） */
export interface ReviewRecord {
  overallRisk: RiskLevel | 'none';
  findings: Array<{ dimension: ReviewDimension; level: RiskLevel }>;
  falsePositiveFeedbacks: Array<{ findingId: string }>;
}

/** 误拦率与五维分布统计 */
export interface DrugReviewStats {
  period: string;
  totalReviews: number;
  byLevel: { high: number; medium: number; low: number };
  dimensionBreakdown: Array<{ dimension: ReviewDimension; count: number }>;
  /** 误拦反馈条数（留痕累计） */
  falsePositiveFeedbacks: number;
  /** 误拦率 = 误拦反馈条数 / 告警总条数，越低越准（0~1，保留 4 位小数） */
  falsePositiveRate: number;
}

// ---------------------------------------------------------------------------
// 内置轻量规则库（「AI核心能力深化」：可插拔替换为权威药学知识库）
// ---------------------------------------------------------------------------

interface InteractionRule {
  a: string;
  b: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
}

/** 药物相互作用规则（子串包含匹配；仅保留证据充分的高/中风险） */
const INTERACTION_RULES: readonly InteractionRule[] = [
  {
    a: '华法林', b: '阿司匹林', level: 'high',
    reason: '华法林与阿司匹林联用显著增加出血风险（抗凝+抗血小板叠加）',
    suggestion: '评估是否必须联用，如需联用加强 INR 监测并观察出血征象',
  },
  {
    a: '华法林', b: '布洛芬', level: 'high',
    reason: 'NSAID 削弱抗凝作用并增加消化道出血风险',
    suggestion: '镇痛优先选用对乙酰氨基酚，必要时加用胃黏膜保护剂',
  },
  {
    a: '辛伐他汀', b: '克拉霉素', level: 'high',
    reason: '克拉霉素抑制 CYP3A4，升高他汀血药浓度，增加横纹肌溶解风险',
    suggestion: '抗感染期间暂停辛伐他汀或更换抗菌方案（如阿奇霉素）',
  },
  {
    a: '辛伐他汀', b: '伊曲康唑', level: 'high',
    reason: '唑类抗真菌药强效抑制 CYP3A4，他汀血药浓度骤升',
    suggestion: '抗真菌治疗期间暂停他汀类',
  },
  {
    a: '依那普利', b: '螺内酯', level: 'high',
    reason: 'ACEI 与保钾利尿剂联用可致严重高钾血症',
    suggestion: '联用期间监测血钾，肾功能不全者避免联用',
  },
  {
    a: '左氧氟沙星', b: '硫酸亚铁', level: 'medium',
    reason: '二价金属离子与喹诺酮螯合，显著降低抗菌药吸收',
    suggestion: '两药间隔至少 2 小时服用',
  },
  {
    a: '二甲双胍', b: '碘海醇', level: 'medium',
    reason: '造影剂与二甲双胍联用增加乳酸酸中毒风险',
    suggestion: '造影前后 48 小时暂停二甲双胍并监测肾功能',
  },
];

/** 药物治疗类别（重复用药判断） */
const DRUG_CLASSES: readonly { category: string; keys: readonly string[] }[] = [
  { category: '非甾体抗炎药(NSAIDs)', keys: ['阿司匹林', '布洛芬', '双氯芬酸', '萘普生'] },
  { category: '质子泵抑制剂(PPI)', keys: ['奥美拉唑', '雷贝拉唑', '兰索拉唑', '泮托拉唑'] },
  { category: '二代头孢菌素', keys: ['头孢克洛', '头孢呋辛', '头孢克肟', '头孢丙烯'] },
  { category: '他汀类调脂药', keys: ['辛伐他汀', '阿托伐他汀', '瑞舒伐他汀'] },
  { category: 'ACEI 类降压药', keys: ['依那普利', '贝那普利', '培哚普利'] },
  { category: '口服降糖药', keys: ['二甲双胍', '格列美脲', '格列齐特'] },
];

/** 诊断禁忌：药品子串 -> 禁忌诊断子串 */
const DISEASE_CONTRA: readonly {
  drug: string; disease: string; level: RiskLevel; reason: string; suggestion: string;
}[] = [
  {
    drug: '阿司匹林', disease: '胃溃疡', level: 'high',
    reason: '活动性消化性溃疡为阿司匹林（NSAID）明确禁忌',
    suggestion: '停用阿司匹林，评估抗血小板方案替代并加胃黏膜保护',
  },
  {
    drug: '阿司匹林', disease: '消化道出血', level: 'high',
    reason: '近期消化道出血史为抗血小板药绝对禁忌',
    suggestion: '暂缓抗血小板治疗，请心血管科会诊评估获益风险',
  },
  {
    drug: '普萘洛尔', disease: '哮喘', level: 'high',
    reason: '非选择性 β 受体阻滞剂可诱发支气管痉挛，哮喘患者禁用',
    suggestion: '更换心脏选择性 β1 阻滞剂或避免使用',
  },
  {
    drug: '二甲双胍', disease: '肾功能不全', level: 'medium',
    reason: '二甲双胍经肾排泄，肾功能不全时蓄积增加乳酸酸中毒风险',
    suggestion: '按 eGFR 调整剂量或更换降糖方案',
  },
];

/** 剂量上限规则（mg） */
const DOSE_RULES: readonly {
  drug: string;
  singleMaxMg?: number;
  dailyMaxMg?: number;
}[] = [
  { drug: '对乙酰氨基酚', singleMaxMg: 1000, dailyMaxMg: 4000 },
  { drug: '布洛芬', singleMaxMg: 800, dailyMaxMg: 2400 },
  { drug: '阿司匹林', singleMaxMg: 1000, dailyMaxMg: 4000 },
];

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function contains(name: unknown, key: string): boolean {
  return String(name ?? '').includes(key);
}

function normalizeMed(med: MedInput | null | undefined): DrugEntry | null {
  if (typeof med === 'string') {
    const name = med.trim();
    return name ? { name } : null;
  }
  if (med && typeof med === 'object' && typeof med.name === 'string' && med.name.trim()) {
    return {
      name: med.name.trim(),
      doseMg: typeof med.doseMg === 'number' && Number.isFinite(med.doseMg) ? med.doseMg : null,
      dosesPerDay: typeof med.dosesPerDay === 'number' && Number.isFinite(med.dosesPerDay) ? med.dosesPerDay : null,
    };
  }
  return null;
}

/** 单次剂量 mg */
function singleDoseMg(d: DrugEntry): number | null {
  return typeof d.doseMg === 'number' && d.doseMg > 0 ? d.doseMg : null;
}

/** 日累计剂量 mg（缺省按每日 1 次保守估算） */
function dailyDoseMg(d: DrugEntry): number | null {
  const single = singleDoseMg(d);
  if (single == null) return null;
  const times = typeof d.dosesPerDay === 'number' && d.dosesPerDay > 0 ? d.dosesPerDay : 1;
  return single * times;
}

function levelRank(l: RiskLevel): number {
  return l === 'high' ? 3 : l === 'medium' ? 2 : 1;
}

function higher(a: RiskLevel | 'none', b: RiskLevel): RiskLevel | 'none' {
  if (a === 'none') return b;
  return levelRank(a as RiskLevel) >= levelRank(b) ? a : b;
}

function findingId(prefix: string, drug: string, related = ''): string {
  const raw = `${prefix}:${drug}${related ? '~' + related : ''}`;
  return raw.replace(/\s+/g, '');
}

// ---------------------------------------------------------------------------
// 五维检测（内部纯函数）
// ---------------------------------------------------------------------------

/** 维度一：药物相互作用（清单内两两） */
function detectInteractions(drugs: DrugEntry[]): Finding[] {
  const out: Finding[] = [];
  for (const rule of INTERACTION_RULES) {
    for (let i = 0; i < drugs.length; i++) {
      for (let j = i + 1; j < drugs.length; j++) {
        const x = drugs[i];
        const y = drugs[j];
        const hitXY = contains(x.name, rule.a) && contains(y.name, rule.b);
        const hitYX = contains(x.name, rule.b) && contains(y.name, rule.a);
        if (hitXY || hitYX) {
          out.push({
            id: findingId('interaction', rule.a, rule.b),
            dimension: 'interaction',
            level: rule.level,
            drug: x.name,
            relatedDrug: y.name,
            title: `相互作用：${rule.a} + ${rule.b}`,
            reason: rule.reason,
            suggestion: rule.suggestion,
          });
        }
      }
    }
  }
  return out;
}

/** 维度二：禁忌症（诊断禁忌 + 过敏史直接匹配） */
function detectContraindications(drugs: DrugEntry[], diseases: string[], allergies: string[]): Finding[] {
  const out: Finding[] = [];

  for (const drug of drugs) {
    // 诊断/疾病禁忌
    for (const rule of DISEASE_CONTRA) {
      if (!contains(drug.name, rule.drug)) continue;
      for (const d of diseases) {
        if (contains(d, rule.disease)) {
          out.push({
            id: findingId('contra', rule.drug, rule.disease),
            dimension: 'contraindication',
            level: rule.level,
            drug: drug.name,
            title: `禁忌：${drug.name}（${rule.disease}）`,
            reason: rule.reason,
            suggestion: rule.suggestion,
          });
        }
      }
    }
    // 过敏史：药品与过敏原直接匹配一律 high
    for (const ag of allergies) {
      if (!ag) continue;
      if (contains(drug.name, ag) || contains(ag, drug.name)) {
        out.push({
          id: findingId('allergy', drug.name, ag),
          dimension: 'contraindication',
          level: 'high',
          drug: drug.name,
          title: `过敏史冲突：${drug.name}`,
          reason: `处方药品与已知过敏原「${ag}」直接匹配`,
          suggestion: '立即停用并替换为非交叉过敏药物，备好急救措施',
        });
      }
    }
  }
  return out;
}

/** 维度三：剂量合理性（单次超量=medium，日累计超量=high） */
function detectDoseIssues(drugs: DrugEntry[]): Finding[] {
  const out: Finding[] = [];
  for (const drug of drugs) {
    for (const rule of DOSE_RULES) {
      if (!contains(drug.name, rule.drug)) continue;
      const single = singleDoseMg(drug);
      const daily = dailyDoseMg(drug);

      if (rule.singleMaxMg != null && single != null && single > rule.singleMaxMg) {
        out.push({
          id: findingId('dose-single', drug.name),
          dimension: 'dose',
          level: 'medium',
          drug: drug.name,
          title: `单次剂量偏高：${drug.name}`,
          reason: `单次剂量 ${single}mg 超过常用上限 ${rule.singleMaxMg}mg`,
          suggestion: '请核对单次给药剂量是否录入有误',
        });
      }
      if (rule.dailyMaxMg != null && daily != null && daily > rule.dailyMaxMg) {
        out.push({
          id: findingId('dose-daily', drug.name),
          dimension: 'dose',
          level: 'high',
          drug: drug.name,
          title: `日累计超量：${drug.name}`,
          reason: `日累计剂量 ${daily}mg 超过安全上限 ${rule.dailyMaxMg}mg，存在过量风险`,
          suggestion: '请按药品说明书下调给药频次或单次剂量',
        });
      }
    }
  }
  return out;
}

/** 维度四：特殊人群（儿童 / 老年） */
function detectSpecialPopulation(drugs: DrugEntry[], age: number | null): Finding[] {
  const out: Finding[] = [];
  const isChild = typeof age === 'number' && age < 18;
  const isGeriatric = typeof age === 'number' && age >= 65;

  for (const drug of drugs) {
    if (isChild && contains(drug.name, '阿司匹林')) {
      out.push({
        id: findingId('sp-child-aspirin', drug.name),
        dimension: 'specialPopulation',
        level: 'high',
        drug: drug.name,
        title: '儿童禁用：阿司匹林',
        reason: '儿童病毒感染期使用阿司匹林可能诱发 Reye 综合征',
        suggestion: '儿童退热镇痛改用对乙酰氨基酚或布洛芬',
      });
    }
    if (isChild && contains(drug.name, '左氧氟沙星')) {
      out.push({
        id: findingId('sp-child-fq', drug.name),
        dimension: 'specialPopulation',
        level: 'medium',
        drug: drug.name,
        title: '儿童慎用：喹诺酮类',
        reason: '喹诺酮类对幼年动物软骨有损伤，儿童原则上避免',
        suggestion: '确需使用时权衡获益并签署知情同意',
      });
    }
    if (isGeriatric && contains(drug.name, '地西泮')) {
      out.push({
        id: findingId('sp-old-bdz', drug.name),
        dimension: 'specialPopulation',
        level: 'medium',
        drug: drug.name,
        title: '老年慎用：苯二氮卓类',
        reason: '地西泮在老年人跌倒、认知障碍风险高（Beers 标准）',
        suggestion: '优先非药物干预，必要时选用短效制剂并缩短疗程',
      });
    }
  }
  return out;
}

/** 维度五：重复用药（同治疗类别两两，medium） */
function detectDuplicateTherapy(drugs: DrugEntry[]): Finding[] {
  const out: Finding[] = [];
  for (const cls of DRUG_CLASSES) {
    const members = drugs.filter((d) => cls.keys.some((k) => contains(d.name, k)));
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (members[i].name === members[j].name) continue;
        out.push({
          id: findingId('dup', cls.category, `${members[i].name}|${members[j].name}`),
          dimension: 'duplicate',
          level: 'medium',
          drug: members[i].name,
          relatedDrug: members[j].name,
          title: `重复用药：${cls.category}`,
          reason: `「${members[i].name}」与「${members[j].name}」同属${cls.category}，联用不增加疗效但叠加不良反应`,
          suggestion: '保留其一，避免同类药物重复给药',
        });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 纯函数入口
// ---------------------------------------------------------------------------

/**
 * AI 合理用药深度审核主入口（纯函数，无 I/O）。
 *
 * @param prescriptionId 处方号（仅随报告回传留痕）
 * @param patientAge     患者年龄（岁）；非法值按 null 处理
 * @param patientGender 患者性别 'male' | 'female' | 其他/空
 * @param allergies      过敏标签列表（如 ['青霉素']）
 * @param diseases       诊断/疾病标签列表（如 ['胃溃疡','哮喘']）
 * @param currentMeds    本次审核用药清单；兼容纯通用名字符串或 {name,doseMg,dosesPerDay}
 * @returns Review       五维告警 + 整体风险 + 计数
 */
export function deepDrugReview(
  prescriptionId: string | null | undefined,
  patientAge: number | null | undefined,
  patientGender: string | null | undefined,
  allergies: string[] | null | undefined,
  diseases: string[] | null | undefined,
  currentMeds: MedInput[] | null | undefined,
): Review {
  const pid = typeof prescriptionId === 'string' && prescriptionId.trim() ? prescriptionId.trim() : 'UNKNOWN';
  const age = typeof patientAge === 'number' && Number.isFinite(patientAge) && patientAge >= 0 ? Math.floor(patientAge) : null;
  // gender 仅留存标签，当前规则不依赖性别做拦截，避免误拦
  void patientGender;

  const allergyList: string[] = Array.isArray(allergies) ? allergies.filter((a): a is string => typeof a === 'string') : [];
  const diseaseList: string[] = Array.isArray(diseases) ? diseases.filter((d): d is string => typeof d === 'string') : [];
  const drugs: DrugEntry[] = Array.isArray(currentMeds)
    ? currentMeds.map((m) => normalizeMed(m)).filter((d): d is DrugEntry => d !== null)
    : [];

  const findings: Finding[] = [
    ...detectInteractions(drugs),
    ...detectContraindications(drugs, diseaseList, allergyList),
    ...detectDoseIssues(drugs),
    ...detectSpecialPopulation(drugs, age),
    ...detectDuplicateTherapy(drugs),
  ];

  let overallRisk: RiskLevel | 'none' = 'none';
  let high = 0;
  let medium = 0;
  let low = 0;
  for (const f of findings) {
    overallRisk = higher(overallRisk, f.level);
    if (f.level === 'high') high += 1;
    else if (f.level === 'medium') medium += 1;
    else low += 1;
  }

  const summary = drugs.length === 0
    ? '处方为空，未执行审核'
    : overallRisk === 'high'
      ? `审核发现 ${high} 项高风险、${medium} 项需关注，建议暂缓调配并复核`
      : overallRisk === 'medium'
        ? `审核发现 ${medium} 项需关注事项，建议医师/药师核对后调配`
        : overallRisk === 'low'
          ? '存在轻微提示项，可常规调配'
          : '五维审核未发现明显用药合理性问题';

  return {
    prescriptionId: pid,
    findings,
    overallRisk,
    counts: { high, medium, low, total: findings.length },
    summary,
    reviewedAt: new Date(0).toISOString(), // 纯函数：固定时间戳，保证可复现；落库时由服务端覆盖
  };
}

/**
 * 误拦反馈留痕构造器（纯函数）：药师认为某条告警误拦时调用，
 * 返回结构化反馈记录，随审核结果一并写回 medmuse.ai_drug_review.false_positive_feedbacks。
 */
export function buildFalsePositiveFeedback(
  reviewId: string,
  findingId: string,
  reason: string | null | undefined,
  operator = '药师',
): FalsePositiveFeedback {
  return {
    reviewId: typeof reviewId === 'string' && reviewId ? reviewId : 'UNKNOWN',
    findingId: typeof findingId === 'string' && findingId ? findingId : 'UNKNOWN',
    reason: typeof reason === 'string' && reason.trim() ? reason.trim() : '药师标记为误拦',
    operator: typeof operator === 'string' && operator.trim() ? operator.trim() : '药师',
    feedbackAt: new Date(0).toISOString(), // 纯函数：固定时间戳；落库时由服务端覆盖
    type: 'false_positive',
  };
}

/**
 * 审核统计（纯函数）：按时间段聚合已留痕审核记录，计算五维分布与误拦率。
 * records 缺省时返回该 period 的基线演示统计（便于前端空态展示）。
 * 误拦率 = 误拦反馈条数 / 告警总条数，持续下降即规则库持续优化。
 */
export function getDrugReviewStats(
  period: string | null | undefined,
  records: ReviewRecord[] | null | undefined,
): DrugReviewStats {
  const p = typeof period === 'string' && period.trim() ? period.trim() : 'all';
  const list: ReviewRecord[] = Array.isArray(records) ? records : [];

  const byLevel = { high: 0, medium: 0, low: 0 };
  const dimCount: Record<ReviewDimension, number> = {
    interaction: 0, contraindication: 0, dose: 0, specialPopulation: 0, duplicate: 0,
  };
  let feedbacks = 0;
  let findingTotal = 0;

  for (const r of list) {
    for (const f of r.findings ?? []) {
      findingTotal += 1;
      if (f.level === 'high' || f.level === 'medium' || f.level === 'low') byLevel[f.level] += 1;
      if (f.dimension in dimCount) dimCount[f.dimension] += 1;
    }
    feedbacks += Array.isArray(r.falsePositiveFeedbacks) ? r.falsePositiveFeedbacks.length : 0;
  }

  const dimensionBreakdown: DrugReviewStats['dimensionBreakdown'] = (
    Object.keys(dimCount) as ReviewDimension[]
  ).map((dimension) => ({ dimension, count: dimCount[dimension] }));

  // 误拦率：反馈条数 / 告警条数；无告警时为 0（不臆造分母）
  const falsePositiveRate = findingTotal > 0
    ? Math.round((feedbacks / findingTotal) * 10000) / 10000
    : 0;

  return {
    period: p,
    totalReviews: list.length,
    byLevel,
    dimensionBreakdown,
    falsePositiveFeedbacks: feedbacks,
    falsePositiveRate,
  };
}
