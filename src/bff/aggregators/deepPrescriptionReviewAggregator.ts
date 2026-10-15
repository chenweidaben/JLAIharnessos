/**
 * 健澜科技 jlmedaios - 用药合理性深度审核聚合器（M126-D）
 *
 * AI能力升级：在 CDS 实时提醒（drugReviewAggregator）与药房审方（pharmacyAssistantAggregator）
 * 之上，提供一张处方的「五维深度审核」纯函数：
 *  - interactions      ：药物相互作用（处方内 + 与当前在用药物）；
 *  - contraindications ：禁忌症 / 适应证外用药（结合患者诊断与人群状态）；
 *  - doseIssues        ：剂量合理性（单次超量 / 日累计超量 / 儿童 mg/kg 超限）；
 *  - duplicateTherapy  ：重复用药（同成分 / 同药理类别，处方内 + 与在用药物）；
 *  - specialPopulation ：特殊人群（妊娠 / 哺乳 / 儿童 / 老年 / 肝肾功能不全）。
 *
 * 定位边界：本模块为 AI 辅助审核结论，不拦截处方、不改变审批状态；
 * 最终用药决定由医师与药师作出（人在回路）。全程只读、不落敏感明文。
 *
 * 纯函数约定：deepPrescriptionReview 无 I/O、确定性、对非法输入安全降级；
 * 规则库为内置轻量规则子集，用于演示与单测，生产环境应替换为权威药学知识库。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class DeepReviewError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'DeepReviewError';
  }
}

// ---------------------------------------------------------------------------
// 类型（纯数据契约）
// ---------------------------------------------------------------------------

export type RiskLevel = 'info' | 'warning' | 'critical';

/** 处方中的一个药品条目 */
export interface ReviewDrug {
  /** 药品通用名（匹配以子串包含为准） */
  name: string;
  /** 单次剂量 mg（数值化，优先于 dosage 字符串解析） */
  doseMg?: number | null;
  /** 每日给药次数（qd=1 / bid=2 / tid=3 / q8h≈3 …） */
  dosesPerDay?: number | null;
  /** 剂量原始描述，如 "500mg" / "0.5g"，用于解析兜底 */
  dosage?: string | null;
  route?: string | null;
}

/** 处方 */
export interface ReviewPrescription {
  drugs: ReviewDrug[];
  /** 诊断列表（中文，如 "胃溃疡" / "哮喘"），用于禁忌症判断 */
  diagnoses?: string[];
}

/** 患者信息（特殊人群 + 剂量计算上下文） */
export interface ReviewPatientInfo {
  age?: number | null;
  weightKg?: number | null;
  gender?: 'male' | 'female' | string | null;
  pregnant?: boolean;
  breastfeeding?: boolean;
  renalImpaired?: boolean;
  hepaticImpaired?: boolean;
}

/** 一条药物相互作用告警 */
export interface InteractionIssue {
  rule: string;
  drugA: string;
  drugB: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
  /** 是否来自「与当前在用药物」的相互作用 */
  withCurrentMed?: boolean;
}

/** 一条禁忌症告警 */
export interface ContraindicationIssue {
  drug: string;
  level: RiskLevel;
  /** 触发禁忌的患者因素（诊断 / 人群） */
  factor: string;
  reason: string;
  suggestion: string;
}

/** 一条剂量告警 */
export interface DoseIssue {
  drug: string;
  level: RiskLevel;
  kind: 'singleOverdose' | 'dailyOverdose' | 'pediatricMgPerKg';
  /** 实际值（mg 或 mg/kg） */
  actual: number;
  /** 上限值 */
  limit: number;
  suggestion: string;
}

/** 一条重复用药告警 */
export interface DuplicateIssue {
  level: RiskLevel;
  drugA: string;
  drugB: string;
  category: string;
  reason: string;
  suggestion: string;
  withCurrentMed?: boolean;
}

/** 一条特殊人群告警 */
export interface SpecialPopulationIssue {
  drug: string;
  level: RiskLevel;
  population: string;
  reason: string;
  suggestion: string;
}

/** 深度审核报告（ReviewReport） */
export interface ReviewReport {
  interactions: InteractionIssue[];
  contraindications: ContraindicationIssue[];
  doseIssues: DoseIssue[];
  duplicateTherapy: DuplicateIssue[];
  specialPopulation: SpecialPopulationIssue[];
  /** 全方最高风险级别 */
  overallRisk: RiskLevel;
  /** 一句话结论 */
  summary: string;
  counts: {
    critical: number;
    warning: number;
    total: number;
  };
}

// ---------------------------------------------------------------------------
// 内置轻量规则库（AI能力升级：可插拔替换为权威知识库）
// ---------------------------------------------------------------------------

interface InteractionRule {
  a: string;
  b: string;
  level: RiskLevel;
  reason: string;
  suggestion: string;
}

/** 药物相互作用规则（子串包含匹配） */
const INTERACTION_RULES: readonly InteractionRule[] = [
  {
    a: '华法林', b: '阿司匹林', level: 'critical',
    reason: '华法林与阿司匹林联用显著增加出血风险（抗凝+抗血小板叠加）',
    suggestion: '评估是否必须联用，如需联用加强 INR 监测并观察出血征象',
  },
  {
    a: '华法林', b: '布洛芬', level: 'critical',
    reason: 'NSAID 削弱抗凝作用并增加消化道出血风险',
    suggestion: '镇痛优先选用对乙酰氨基酚，必要时加用胃黏膜保护剂',
  },
  {
    a: '辛伐他汀', b: '克拉霉素', level: 'critical',
    reason: '克拉霉素抑制 CYP3A4，升高他汀血药浓度，增加横纹肌溶解风险',
    suggestion: '抗感染期间暂停辛伐他汀或更换抗菌方案（如阿奇霉素）',
  },
  {
    a: '辛伐他汀', b: '伊曲康唑', level: 'critical',
    reason: '唑类抗真菌药强效抑制 CYP3A4，他汀血药浓度骤升',
    suggestion: '抗真菌治疗期间暂停他汀类',
  },
  {
    a: '依那普利', b: '螺内酯', level: 'critical',
    reason: 'ACEI 与保钾利尿剂联用可致严重高钾血症',
    suggestion: '联用期间监测血钾，肾功能不全者避免联用',
  },
  {
    a: '左氧氟沙星', b: '硫酸亚铁', level: 'warning',
    reason: '二价金属离子与喹诺酮螯合，显著降低抗菌药吸收',
    suggestion: '两药间隔至少 2 小时服用',
  },
  {
    a: '二甲双胍', b: '碘海醇', level: 'warning',
    reason: '造影剂与二甲双胍联用增加乳酸酸中毒风险',
    suggestion: '造影前后 48 小时暂停二甲双胍并监测肾功能',
  },
];

/** 药物类别（用于重复用药判断） */
const DRUG_CLASSES: readonly { category: string; keys: readonly string[] }[] = [
  { category: '非甾体抗炎药(NSAIDs)', keys: ['阿司匹林', '布洛芬', '双氯芬酸', '萘普生'] },
  { category: '质子泵抑制剂(PPI)', keys: ['奥美拉唑', '雷贝拉唑', '兰索拉唑', '泮托拉唑'] },
  { category: '二代头孢菌素', keys: ['头孢克洛', '头孢呋辛', '头孢克肟', '头孢丙烯'] },
  { category: '他汀类', keys: ['辛伐他汀', '阿托伐他汀', '瑞舒伐他汀'] },
  { category: '血管紧张素转换酶抑制剂', keys: ['依那普利', '贝那普利', '培哚普利'] },
  { category: '口服降糖药', keys: ['二甲双胍', '格列美脲', '格列齐特'] },
];

/** 诊断禁忌：药品子串 -> 禁忌诊断子串 */
const DIAGNOSIS_CONTRA: readonly { drug: string; diagnosis: string; level: RiskLevel; reason: string; suggestion: string }[] = [
  {
    drug: '阿司匹林', diagnosis: '胃溃疡', level: 'critical',
    reason: '活动性消化性溃疡为阿司匹林（NSAID）明确禁忌',
    suggestion: '停用阿司匹林，评估抗血小板方案替代并加胃黏膜保护',
  },
  {
    drug: '阿司匹林', diagnosis: '消化道出血', level: 'critical',
    reason: '近期消化道出血史为抗血小板药绝对禁忌',
    suggestion: '暂缓抗血小板治疗，请心血管科会诊评估获益风险',
  },
  {
    drug: '普萘洛尔', diagnosis: '哮喘', level: 'critical',
    reason: '非选择性 β 受体阻滞剂可诱发支气管痉挛，哮喘患者禁用',
    suggestion: '更换心脏选择性 β1 阻滞剂或避免使用',
  },
  {
    drug: '二甲双胍', diagnosis: '肾功能不全', level: 'warning',
    reason: '二甲双胍经肾排泄，肾功能不全时蓄积增加乳酸酸中毒风险',
    suggestion: '按 eGFR 调整剂量或更换降糖方案',
  },
];

/** 特殊人群禁忌 / 警告 */
const POPULATION_RULES: readonly {
  drug: string;
  when: (p: ReviewPatientInfo) => { population: string; level: RiskLevel; reason: string; suggestion: string } | null;
}[] = [
  {
    drug: '阿司匹林',
    when: (p) => {
      if (typeof p.age === 'number' && p.age < 18) {
        return {
          population: '儿童(<18岁)', level: 'critical',
          reason: '儿童病毒感染期使用阿司匹林可能诱发 Reye 综合征',
          suggestion: '儿童退热镇痛改用对乙酰氨基酚或布洛芬',
        };
      }
      return null;
    },
  },
  {
    drug: '左氧氟沙星',
    when: (p) => {
      if (p.pregnant) {
        return {
          population: '妊娠期', level: 'critical',
          reason: '喹诺酮类影响胎儿软骨发育，妊娠期禁用',
          suggestion: '妊娠期抗菌方案更换为青霉素/头孢类（需排除过敏）',
        };
      }
      if (typeof p.age === 'number' && p.age < 18) {
        return {
          population: '儿童(<18岁)', level: 'warning',
          reason: '喹诺酮类对幼年动物软骨有损伤，儿童原则上避免',
          suggestion: '确需使用时权衡获益并签署知情同意',
        };
      }
      return null;
    },
  },
  {
    drug: '辛伐他汀',
    when: (p) => {
      if (p.pregnant) {
        return {
          population: '妊娠期', level: 'critical',
          reason: '他汀类妊娠期禁用，可能影响胎儿脂质代谢',
          suggestion: '妊娠期停用他汀，产后再评估调脂方案',
        };
      }
      return null;
    },
  },
  {
    drug: '地西泮',
    when: (p) => {
      if (typeof p.age === 'number' && p.age >= 65) {
        return {
          population: '老年(≥65岁)', level: 'warning',
          reason: '苯二氮卓类在老年人跌倒、认知障碍风险高（Beers 标准）',
          suggestion: '优先非药物干预，必要时选用短效制剂并缩短疗程',
        };
      }
      return null;
    },
  },
  {
    drug: '氨基糖苷',
    when: (p) => {
      if (p.renalImpaired) {
        return {
          population: '肾功能不全', level: 'warning',
          reason: '氨基糖苷类具肾毒性与耳毒性，肾功能不全需调整剂量',
          suggestion: '按肌酐清除率调整给药间隔并监测血药浓度',
        };
      }
      return null;
    },
  },
];

/** 剂量上限规则（mg） */
const DOSE_RULES: readonly {
  drug: string;
  /** 单次剂量上限 mg；不设为 null */
  singleMaxMg?: number;
  /** 日累计上限 mg */
  dailyMaxMg?: number;
  /** 儿童单次 mg/kg 上限（需有体重） */
  pediatricMgPerKg?: number;
}[] = [
  { drug: '对乙酰氨基酚', singleMaxMg: 1000, dailyMaxMg: 4000, pediatricMgPerKg: 15 },
  { drug: '布洛芬', singleMaxMg: 800, dailyMaxMg: 2400, pediatricMgPerKg: 10 },
  { drug: '阿司匹林', singleMaxMg: 1000, dailyMaxMg: 4000 },
];

// ---------------------------------------------------------------------------
// 工具函数
// ---------------------------------------------------------------------------

function contains(name: string, key: string): boolean {
  return String(name ?? '').includes(key);
}

/** 解析剂量字符串为 mg（支持 "500mg" / "0.5g" / "250 mg"） */
export function parseDosageToMg(dosage: string | null | undefined): number | null {
  if (!dosage) return null;
  const s = String(dosage).toLowerCase().replace(/\s+/g, '');
  const m = s.match(/([0-9]+(?:\.[0-9]+)?)(mg|g|ml)/);
  if (!m) return null;
  const value = Number(m[1]);
  if (!Number.isFinite(value)) return null;
  if (m[2] === 'g') return value * 1000;
  if (m[2] === 'mg') return value;
  // ml 不做浓度假设，视为未知
  return null;
}

/** 取药品单次剂量 mg：优先数值字段，其次解析 dosage 字符串 */
function singleDoseMg(drug: ReviewDrug): number | null {
  if (typeof drug.doseMg === 'number' && Number.isFinite(drug.doseMg) && drug.doseMg > 0) {
    return drug.doseMg;
  }
  return parseDosageToMg(drug.dosage);
}

/** 取日累计剂量 mg */
function dailyDoseMg(drug: ReviewDrug): number | null {
  const single = singleDoseMg(drug);
  if (single == null) return null;
  const times =
    typeof drug.dosesPerDay === 'number' && Number.isFinite(drug.dosesPerDay) && drug.dosesPerDay > 0
      ? drug.dosesPerDay
      : 1;
  return single * times;
}

function levelRank(l: RiskLevel): number {
  return l === 'critical' ? 3 : l === 'warning' ? 2 : 1;
}

function higher(a: RiskLevel, b: RiskLevel): RiskLevel {
  return levelRank(a) >= levelRank(b) ? a : b;
}

// ---------------------------------------------------------------------------
// 各维度检测（内部纯函数）
// ---------------------------------------------------------------------------

/** 相互作用：处方内两两 + 与当前在用药物 */
function detectInteractions(
  rx: ReviewDrug[],
  currentMeds: string[],
): InteractionIssue[] {
  const out: InteractionIssue[] = [];
  const rxNames = rx.map((d) => d.name);
  const pool: Array<{ name: string; isCurrent: boolean }> = [
    ...rxNames.map((n) => ({ name: n, isCurrent: false })),
    ...currentMeds.map((n) => ({ name: n, isCurrent: true })),
  ];

  for (const rule of INTERACTION_RULES) {
    for (let i = 0; i < pool.length; i++) {
      for (let j = i + 1; j < pool.length; j++) {
        const x = pool[i];
        const y = pool[j];
        const hitXY = contains(x.name, rule.a) && contains(y.name, rule.b);
        const hitYX = contains(x.name, rule.b) && contains(y.name, rule.a);
        if (hitXY || hitYX) {
          out.push({
            rule: `interaction.${rule.a}_${rule.b}`,
            drugA: x.name,
            drugB: y.name,
            level: rule.level,
            reason: rule.reason,
            suggestion: rule.suggestion,
            withCurrentMed: x.isCurrent || y.isCurrent,
          });
        }
      }
    }
  }
  return out;
}

/** 禁忌症：处方药品 vs 诊断 */
function detectContraindications(
  rx: ReviewDrug[],
  diagnoses: string[],
): ContraindicationIssue[] {
  const out: ContraindicationIssue[] = [];
  for (const drug of rx) {
    for (const rule of DIAGNOSIS_CONTRA) {
      if (!contains(drug.name, rule.drug)) continue;
      for (const d of diagnoses) {
        if (contains(d, rule.diagnosis)) {
          out.push({
            drug: drug.name,
            level: rule.level,
            factor: d,
            reason: rule.reason,
            suggestion: rule.suggestion,
          });
        }
      }
    }
  }
  return out;
}

/** 剂量合理性：单次超量 / 日累计超量 / 儿童 mg/kg */
function detectDoseIssues(rx: ReviewDrug[], patient: ReviewPatientInfo): DoseIssue[] {
  const out: DoseIssue[] = [];
  const hasWeight = typeof patient.weightKg === 'number' && patient.weightKg > 0;
  const isChild = typeof patient.age === 'number' && patient.age < 18;

  for (const drug of rx) {
    for (const rule of DOSE_RULES) {
      if (!contains(drug.name, rule.drug)) continue;
      const single = singleDoseMg(drug);
      const daily = dailyDoseMg(drug);

      if (rule.singleMaxMg != null && single != null && single > rule.singleMaxMg) {
        out.push({
          drug: drug.name, level: 'warning', kind: 'singleOverdose',
          actual: Math.round(single * 10) / 10, limit: rule.singleMaxMg,
          suggestion: `单次剂量 ${single}mg 超过常用上限 ${rule.singleMaxMg}mg，请核对`,
        });
      }
      if (rule.dailyMaxMg != null && daily != null && daily > rule.dailyMaxMg) {
        out.push({
          drug: drug.name, level: 'critical', kind: 'dailyOverdose',
          actual: Math.round(daily * 10) / 10, limit: rule.dailyMaxMg,
          suggestion: `日累计剂量 ${daily}mg 超过安全上限 ${rule.dailyMaxMg}mg，存在过量风险`,
        });
      }
      if (rule.pediatricMgPerKg != null && isChild && hasWeight && single != null) {
        const mgPerKg = single / (patient.weightKg as number);
        if (mgPerKg > rule.pediatricMgPerKg) {
          out.push({
            drug: drug.name, level: 'warning', kind: 'pediatricMgPerKg',
            actual: Math.round(mgPerKg * 10) / 10, limit: rule.pediatricMgPerKg,
            suggestion: `儿童单次 ${mgPerKg.toFixed(1)}mg/kg 超过推荐 ${rule.pediatricMgPerKg}mg/kg，请按体重重算`,
          });
        }
      }
    }
  }
  return out;
}

/** 重复用药：同类别两两（处方内 + 与当前在用药物） */
function detectDuplicateTherapy(
  rx: ReviewDrug[],
  currentMeds: string[],
): DuplicateIssue[] {
  const out: DuplicateIssue[] = [];
  const pool: Array<{ name: string; isCurrent: boolean }> = [
    ...rx.map((d) => ({ name: d.name, isCurrent: false })),
    ...currentMeds.map((n) => ({ name: n, isCurrent: true })),
  ];

  for (const cls of DRUG_CLASSES) {
    const members = pool.filter((p) => cls.keys.some((k) => contains(p.name, k)));
    for (let i = 0; i < members.length; i++) {
      for (let j = i + 1; j < members.length; j++) {
        if (members[i].name === members[j].name) continue;
        out.push({
          level: 'warning',
          drugA: members[i].name,
          drugB: members[j].name,
          category: cls.category,
          reason: `两药同属${cls.category}，联用不增加疗效但叠加不良反应`,
          suggestion: `保留其一，避免同类药物重复给药`,
          withCurrentMed: members[i].isCurrent || members[j].isCurrent,
        });
      }
    }
  }
  return out;
}

/** 特殊人群：妊娠 / 哺乳 / 儿童 / 老年 / 肝肾功能不全 */
function detectSpecialPopulation(
  rx: ReviewDrug[],
  patient: ReviewPatientInfo,
): SpecialPopulationIssue[] {
  const out: SpecialPopulationIssue[] = [];
  for (const drug of rx) {
    for (const rule of POPULATION_RULES) {
      if (!contains(drug.name, rule.drug)) continue;
      const hit = rule.when(patient);
      if (hit) {
        out.push({ drug: drug.name, ...hit });
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// 纯函数入口（AI能力升级：五维深度审核）
// ---------------------------------------------------------------------------

/**
 * 用药合理性深度审核主入口。
 * 对非法输入（null / 非数组）安全降级为空维度，绝不抛错。
 *
 * @param prescription    处方（药品列表 + 诊断）
 * @param patientInfo     患者信息（年龄/体重/妊娠/哺乳/肝肾功能）
 * @param currentMedications 当前在用药物通用名列表
 * @param allergies       患者过敏史（过敏原名称列表，用于交叉提示）
 */
export function deepPrescriptionReview(
  prescription: ReviewPrescription | null | undefined,
  patientInfo: ReviewPatientInfo | null | undefined,
  currentMedications: string[] | null | undefined,
  allergies: string[] | null | undefined,
): ReviewReport {
  const rx: ReviewDrug[] = Array.isArray(prescription?.drugs) ? prescription!.drugs : [];
  const diagnoses: string[] = Array.isArray(prescription?.diagnoses) ? prescription!.diagnoses! : [];
  const patient: ReviewPatientInfo = patientInfo ?? {};
  const currentMeds: string[] = Array.isArray(currentMedications) ? currentMedications : [];
  const allergyList: string[] = Array.isArray(allergies) ? allergies : [];

  const interactions = detectInteractions(rx, currentMeds);
  const contraindications = detectContraindications(rx, diagnoses);
  const doseIssues = detectDoseIssues(rx, patient);
  const duplicateTherapy = detectDuplicateTherapy(rx, currentMeds);
  const specialPopulation = detectSpecialPopulation(rx, patient);

  // 过敏交叉提示并入禁忌症维度（青霉素类过敏 -> 处方含青霉素/阿莫西林）
  const allergyHits: ContraindicationIssue[] = [];
  for (const drug of rx) {
    for (const ag of allergyList) {
      if (!ag) continue;
      if (contains(drug.name, ag) || contains(ag, drug.name)) {
        allergyHits.push({
          drug: drug.name,
          level: 'critical',
          factor: `过敏史:${ag}`,
          reason: `处方药品与已知过敏原「${ag}」直接匹配`,
          suggestion: `立即停用并替换为非交叉过敏药物，备好急救措施`,
        });
      }
    }
  }

  const all: Array<{ level: RiskLevel }> = [
    ...interactions, ...contraindications, ...allergyHits,
    ...doseIssues, ...duplicateTherapy, ...specialPopulation,
  ];

  let overallRisk: RiskLevel = 'info';
  let critical = 0;
  let warning = 0;
  for (const item of all) {
    overallRisk = higher(overallRisk, item.level);
    if (item.level === 'critical') critical += 1;
    else if (item.level === 'warning') warning += 1;
  }

  const summary = rx.length === 0
    ? '处方为空，未执行审核'
    : overallRisk === 'critical'
      ? `审核发现 ${critical} 项高风险、${warning} 项需关注，建议暂缓调配并复核`
      : overallRisk === 'warning'
        ? `审核发现 ${warning} 项需关注事项，建议医师/药师核对后调配`
        : '五维审核未发现明显用药合理性问题';

  return {
    interactions,
    contraindications: [...contraindications, ...allergyHits],
    doseIssues,
    duplicateTherapy,
    specialPopulation,
    overallRisk,
    summary,
    counts: { critical, warning, total: all.length },
  };
}
