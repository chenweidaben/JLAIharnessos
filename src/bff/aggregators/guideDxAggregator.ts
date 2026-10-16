/**
 * ============================================================================
 * AI 辅助诊断深化（M160-C）：临床指南对齐
 * ----------------------------------------------------------------------------
 * 在 AI 辅助诊断之上，叠加权威临床指南的"硬阈值"对齐层：
 *
 *   - guideBasedDiagnosis(symptoms, history, labResults)
 *       按四部权威指南的诊断切点，逐条判断患者是否满足诊断标准并分级/分层；
 *   - checkTreatmentGuideline(diagnosis, treatment)
 *       核查当前治疗方案是否落在指南推荐的一线治疗之内；
 *   - generateGuidelineSuggestion(diagnosis)
 *       输出该诊断对应的指南级治疗建议（一线药物 / 控制目标 / 监测随访）；
 *   - deviationFromGuideline(diagnosis, actualTreatment, guidelineTreatment)
 *       对比实际治疗与指南治疗，量化偏离项与严重度。
 *
 * 内置权威指南（阈值均取自公开发布版本，不自行编造）：
 *   - 高血压：《中国高血压防治指南(2024)》——诊室血压 ≥140/90 mmHg 诊断；
 *     家庭血压 ≥135/85 mmHg；1/2/3 级分层 140-159/90-99、160-179/100-109、
 *     ≥180/110；一般患者目标 <140/90，能耐受者合并糖尿病/高危者 <130/80。
 *   - 糖尿病：《中国 2 型糖尿病防治指南(CDS 2024)》——空腹血糖 FPG ≥7.0 mmol/L、
 *     OGTT 2hPG ≥11.1 mmol/L、随机血糖 ≥11.1 mmol/L 伴"三多一少"症状、
 *     HbA1c ≥6.5%；多数成人 HbA1c 控制目标 <7%。
 *   - 冠心病：《2024 ESC 急性冠脉综合征/慢性冠脉综合征指南》——确诊冠心病后
 *     二级预防：双联抗血小板(DAPT)、高强度他汀、β受体阻滞剂、ACEI/ARB；
 *     症状性心绞痛予硝酸酯类。
 *   - 社区获得性肺炎：《IDSA/ATS 成人社区获得性肺炎指南(2019)》——诊断需
 *     新发呼吸道症状 + 胸部影像新发浸润影；严重度以 CURB-65 分层，
 *     CURB-65 ≥2 建议住院；经验性抗感染按门诊/住院分层选药。
 *
 * 【远期路线图】后续将把上述硬编码阈值迁移到"指南知识库"（可热更新、带版本号与
 * 引用出处），并接入真实 EMR/LIS 的结构化检验结果，本切片仅为纯函数规则层。
 *
 * 医疗安全红线：本模块输出为指南对齐的辅助建议，不构成诊断与处方结论；
 * 最终诊疗决策须由执业医师结合病史、查体与辅助检查综合判定。
 *
 * 纯函数约定：四个导出函数均为确定性计算、无 I/O、无随机数。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/* ---------------------------------------------------------------------------
 * 类型定义
 * ------------------------------------------------------------------------ */

/** 症状（兼容字符串数组与对象数组两种入参形态） */
export type SymptomInput = string | { name: string; onset?: string };

/** 既往病史 */
export interface GuideHistoryInput {
  chronicDiseases?: string[];
  smoking?: boolean;
  notes?: string;
}

/**
 * 检验/体征结果（结构化数值；键名语义见下）。
 * 血压：systolic/diastolic(mmHg)；血糖：fastingGlucose/postprandial2h/randomGlucose
 * (mmol/L)、hba1c(%)；肺炎：wbc(×10^9/L)、crp(mg/L)、pct(ng/mL)、spo2(%)、
 * respiratoryRate(次/分)、urea(mmol/L)、age(岁)、confusion(意识模糊)、
 * newInfiltrate(影像新发浸润影)。
 */
export interface GuideLabResults {
  systolic?: number;
  diastolic?: number;
  fastingGlucose?: number;
  postprandial2h?: number;
  randomGlucose?: number;
  hba1c?: number;
  wbc?: number;
  crp?: number;
  pct?: number;
  spo2?: number;
  respiratoryRate?: number;
  urea?: number;
  age?: number;
  confusion?: boolean;
  newInfiltrate?: boolean;
  [k: string]: number | boolean | undefined;
}

/** 四部指南覆盖的病种键 */
export type GuideConditionKey = 'hypertension' | 'diabetes' | 'chd' | 'pneumonia';

/** 单病种指南对齐评估 */
export interface ConditionAssessment {
  condition: GuideConditionKey;
  /** 病种中文名 */
  label: string;
  icd10: string;
  /** 对齐的权威指南名称 */
  guideline: string;
  /** 是否满足该指南的诊断切点 */
  diagnosed: boolean;
  /** 分级 / 危险分层（如 2 级高血压、CURB-65=2） */
  severity: string;
  /** 命中/未命中阈值的说明（观测值 vs 切点） */
  thresholdNote: string;
  /** 观测到的关键数值 */
  observed: Record<string, number | string | boolean>;
}

/** guideBasedDiagnosis 返回体 */
export interface GuideDiagnosisResult {
  /** 逐病种评估结果（固定四个病种顺序） */
  assessments: ConditionAssessment[];
  /** 首要命中诊断（diagnosed=true 中优先级最高者）；无命中为 null */
  primary: ConditionAssessment | null;
  disclaimer: string;
}

/** 治疗方案（医生实际开具） */
export interface TreatmentPlan {
  /** 药物名（中文/通用名关键词，如 氨氯地平、二甲双胍、阿司匹林） */
  drugs?: string[];
  /** 非药物干预（如 生活方式干预、氧疗、住院监护） */
  interventions?: string[];
  /** 当前控制值/目标（如 血压 150/95、HbA1c 7.8%） */
  currentControl?: string;
}

/** 治疗核查结果 */
export interface TreatmentCheck {
  condition: GuideConditionKey | string;
  guideline: string;
  /** 是否符合指南一线治疗 */
  compliant: boolean;
  /** 指南要求的一线治疗/必选药物 */
  requiredFirstLine: string[];
  /** 问题清单 */
  issues: Array<{ level: 'error' | 'warning' | 'info'; message: string }>;
  /** 符合度评分 0~100 */
  score: number;
}

/** 指南治疗建议 */
export interface GuidelineSuggestion {
  condition: GuideConditionKey;
  label: string;
  icd10: string;
  guideline: string;
  /** 诊断标准切点 */
  diagnosisCriteria: string[];
  /** 一线治疗 */
  firstLine: string[];
  /** 控制目标 */
  targets: string[];
  /** 监测随访 */
  monitoring: string[];
}

/** 偏离项 */
export interface DeviationItem {
  /** missing=指南要求但缺失 / extra=超指南额外 / nonFirstLine=非一线 */
  type: 'missing' | 'extra' | 'nonFirstLine';
  item: string;
  severity: 'major' | 'minor' | 'info';
  message: string;
}

/** 偏离分析结果 */
export interface DeviationAnalysis {
  condition: GuideConditionKey | string;
  deviations: DeviationItem[];
  deviationCount: number;
  /** aligned=基本对齐 / minor=轻度偏离 / major=显著偏离 */
  overallAlignment: 'aligned' | 'minor' | 'major';
}

/* ---------------------------------------------------------------------------
 * 权威指南阈值常量表（引自各指南公开发布版本）
 * ------------------------------------------------------------------------ */

/** 中国高血压防治指南(2024) 诊断切点（mmHg） */
export const BP_THRESHOLDS = {
  /** 诊室血压诊断切点 */
  officeDiagnosis: { systolic: 140, diastolic: 90 },
  /** 家庭血压诊断切点 */
  homeDiagnosis: { systolic: 135, diastolic: 85 },
  /** 控制目标：一般患者 */
  targetGeneral: { systolic: 140, diastolic: 90 },
  /** 控制目标：能耐受/合并糖尿病/高危 */
  targetTight: { systolic: 130, diastolic: 80 },
} as const;

/** CDS 2024 糖尿病诊断切点（mmol/L；HbA1c 为 %） */
export const DM_THRESHOLDS = {
  fastingGlucose: 7.0,
  postprandial2h: 11.1,
  randomGlucose: 11.1,
  hba1c: 6.5,
  /** 多数成人 HbA1c 控制目标 */
  hba1cTarget: 7.0,
} as const;

/** IDSA/ATS 2019 CAP：CURB-65 各项切点 */
export const CAP_CURB65 = {
  /** 呼吸频率 ≥30 次/分 */
  rrHigh: 30,
  /** 尿素氮对应尿素（BUN≈urea×2.14，此处按指南 BUN ≥7mmol/L 尿素近似） */
  ureaHigh: 7.0,
  /** 低血压：收缩压<90 或 舒张压≤60 */
  sbpLow: 90,
  dbpLow: 60,
  /** 年龄切点 */
  ageHigh: 65,
} as const;

/* ---------------------------------------------------------------------------
 * 指南知识库：一线治疗 / 目标 / 监测（供 check / suggest / deviation 共用）
 * ------------------------------------------------------------------------ */

interface GuidelineEntry {
  key: GuideConditionKey;
  label: string;
  icd10: string;
  guideline: string;
  diagnosisCriteria: string[];
  firstLine: string[];
  targets: string[];
  monitoring: string[];
}

const GUIDELINE_BOOK: Record<GuideConditionKey, GuidelineEntry> = {
  hypertension: {
    key: 'hypertension',
    label: '原发性高血压',
    icd10: 'I10.x00',
    guideline: '中国高血压防治指南(2024)',
    diagnosisCriteria: [
      `诊室血压 ≥${BP_THRESHOLDS.officeDiagnosis.systolic}/${BP_THRESHOLDS.officeDiagnosis.diastolic} mmHg（非同日三次）`,
      `家庭血压 ≥${BP_THRESHOLDS.homeDiagnosis.systolic}/${BP_THRESHOLDS.homeDiagnosis.diastolic} mmHg`,
    ],
    firstLine: [
      '生活方式干预（限盐<5g/d、运动、控体重、戒烟限酒）',
      '噻嗪样利尿剂（吲达帕胺）',
      '二氢吡啶类CCB（氨氯地平）',
      'ACEI（普利类）',
      'ARB（沙坦类）',
    ],
    targets: [
      `一般患者血压 <${BP_THRESHOLDS.targetGeneral.systolic}/${BP_THRESHOLDS.targetGeneral.diastolic} mmHg`,
      `能耐受者及合并糖尿病/高危者 <${BP_THRESHOLDS.targetTight.systolic}/${BP_THRESHOLDS.targetTight.diastolic} mmHg`,
    ],
    monitoring: ['诊室+家庭血压监测', '定期血脂血糖、肾功能、尿微量白蛋白', '靶器官损害评估'],
  },
  diabetes: {
    key: 'diabetes',
    label: '2型糖尿病',
    icd10: 'E11.900',
    guideline: '中国2型糖尿病防治指南(CDS 2024)',
    diagnosisCriteria: [
      `空腹血糖 FPG ≥${DM_THRESHOLDS.fastingGlucose} mmol/L`,
      `OGTT 2hPG ≥${DM_THRESHOLDS.postprandial2h} mmol/L`,
      `随机血糖 ≥${DM_THRESHOLDS.randomGlucose} mmol/L 伴"三多一少"症状`,
      `HbA1c ≥${DM_THRESHOLDS.hba1c}%`,
    ],
    firstLine: [
      '医学营养与运动（生活方式干预）',
      '二甲双胍（一线用药）',
      '合并ASCVD/心衰/慢性肾病优选GLP-1RA或SGLT2i',
    ],
    targets: [`多数成人 HbA1c <${DM_THRESHOLDS.hba1cTarget}%`],
    monitoring: ['空腹+餐后血糖、HbA1c 每3个月', '尿微量白蛋白/肌酐比', '眼底与足部并发症筛查'],
  },
  chd: {
    key: 'chd',
    label: '冠心病（急性/慢性冠脉综合征）',
    icd10: 'I25.100',
    guideline: '2024 ESC 急性冠脉综合征/慢性冠脉综合征指南',
    diagnosisCriteria: [
      '典型缺血性胸痛（压榨样、活动诱发、休息/硝酸酯缓解）',
      '心电图缺血改变或肌钙蛋白升高',
      '冠脉CTA/造影提示≥1支主要血管狭窄≥50%',
    ],
    firstLine: [
      '双联抗血小板：阿司匹林 + P2Y12抑制剂（氯吡格雷/替格瑞洛）',
      '高强度他汀（阿托伐他汀/瑞舒伐他汀）',
      'β受体阻滞剂',
      'ACEI/ARB',
      '症状性心绞痛：硝酸酯类',
    ],
    targets: ['血压<130/80 mmHg', 'LDL-C <1.4 mmol/L（极高危）', '心率控制在55~60次/分'],
    monitoring: ['心电图、肌钙蛋白动态监测', '血脂(尤其LDL-C)、肝肾功能', '出血与他汀耐受性监测'],
  },
  pneumonia: {
    key: 'pneumonia',
    label: '社区获得性肺炎(CAP)',
    icd10: 'J18.900',
    guideline: 'IDSA/ATS 成人社区获得性肺炎指南(2019)',
    diagnosisCriteria: [
      '新发呼吸道症状（发热/咳嗽/咳痰/气促）',
      '胸部影像新发浸润影（必备条件之一）',
      'CURB-65 评分分层决定门诊/住院',
    ],
    firstLine: [
      '无合并症门诊：阿莫西林（或大环内酯类/多西环素）',
      '有合并症/住院：β内酰胺类 + 大环内酯类，或呼吸喹诺酮单药',
      '氧疗与气道管理（SpO₂<90%）',
      '退热化痰对症支持',
    ],
    targets: ['体温正常、呼吸道症状缓解', 'SpO₂ ≥92%', 'CRP/PCT 下降趋势'],
    monitoring: ['CURB-65 复评', '血常规+CRP+PCT 动态', '胸部影像复查评估吸收'],
  },
};

/* ---------------------------------------------------------------------------
 * 工具函数
 * ------------------------------------------------------------------------ */

/** 归一化症状文本 */
function symptomsText(symptoms: SymptomInput[]): string {
  return (Array.isArray(symptoms) ? symptoms : [])
    .map((s) => (typeof s === 'string' ? s : `${s?.name ?? ''} ${s?.onset ?? ''}`))
    .join(' ')
    .toLowerCase();
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/* ---------------------------------------------------------------------------
 * 各病种诊断评估
 * ------------------------------------------------------------------------ */

function assessHypertension(lab: GuideLabResults): ConditionAssessment {
  const entry = GUIDELINE_BOOK.hypertension;
  const sys = lab.systolic;
  const dia = lab.diastolic;
  const observed: Record<string, number | string | boolean> = {};
  if (typeof sys === 'number') observed.systolic = sys;
  if (typeof dia === 'number') observed.diastolic = dia;

  const hasBP = typeof sys === 'number' && typeof dia === 'number';
  const meets = hasBP && (sys >= BP_THRESHOLDS.officeDiagnosis.systolic || dia >= BP_THRESHOLDS.officeDiagnosis.diastolic);

  let severity = '未达诊断切点';
  if (meets && hasBP) {
    if (sys >= 180 || dia >= 110) severity = '3级高血压（≥180/110）';
    else if (sys >= 160 || dia >= 100) severity = '2级高血压（160-179/100-109）';
    else severity = '1级高血压（140-159/90-99）';
  }

  return {
    condition: 'hypertension',
    label: entry.label,
    icd10: entry.icd10,
    guideline: entry.guideline,
    diagnosed: meets,
    severity,
    thresholdNote: hasBP
      ? `观测 ${sys}/${dia} mmHg；切点 ≥${BP_THRESHOLDS.officeDiagnosis.systolic}/${BP_THRESHOLDS.officeDiagnosis.diastolic} mmHg`
      : '未提供血压数值，无法判定',
    observed,
  };
}

function assessDiabetes(symText: string, lab: GuideLabResults): ConditionAssessment {
  const entry = GUIDELINE_BOOK.diabetes;
  const observed: Record<string, number | string | boolean> = {};
  if (typeof lab.fastingGlucose === 'number') observed.fastingGlucose = lab.fastingGlucose;
  if (typeof lab.postprandial2h === 'number') observed.postprandial2h = lab.postprandial2h;
  if (typeof lab.randomGlucose === 'number') observed.randomGlucose = lab.randomGlucose;
  if (typeof lab.hba1c === 'number') observed.hba1c = lab.hba1c;

  const hasSymptoms = /多饮|多尿|多食|消瘦/.test(symText);
  // 切点命中：任意一项达标即满足诊断（随机血糖需伴症状或重复检测，此处保守标注）
  const hits: string[] = [];
  if (typeof lab.fastingGlucose === 'number' && lab.fastingGlucose >= DM_THRESHOLDS.fastingGlucose) {
    hits.push(`FPG ${lab.fastingGlucose}≥${DM_THRESHOLDS.fastingGlucose}`);
  }
  if (typeof lab.postprandial2h === 'number' && lab.postprandial2h >= DM_THRESHOLDS.postprandial2h) {
    hits.push(`2hPG ${lab.postprandial2h}≥${DM_THRESHOLDS.postprandial2h}`);
  }
  if (typeof lab.hba1c === 'number' && lab.hba1c >= DM_THRESHOLDS.hba1c) {
    hits.push(`HbA1c ${lab.hba1c}%≥${DM_THRESHOLDS.hba1c}%`);
  }
  // 随机血糖：需伴典型症状方满足单测诊断
  if (typeof lab.randomGlucose === 'number' && lab.randomGlucose >= DM_THRESHOLDS.randomGlucose && hasSymptoms) {
    hits.push(`随机血糖 ${lab.randomGlucose}≥${DM_THRESHOLDS.randomGlucose}(伴症状)`);
  }

  const diagnosed = hits.length > 0;
  let severity = '未达诊断切点';
  if (diagnosed && typeof lab.hba1c === 'number') {
    if (lab.hba1c >= 9) severity = `血糖控制差（HbA1c ${lab.hba1c}%，建议起始注射治疗）`;
    else if (lab.hba1c >= 7) severity = `血糖未达标（HbA1c ${lab.hba1c}%>7%）`;
    else severity = `血糖达标（HbA1c ${lab.hba1c}%）`;
  } else if (diagnosed) {
    severity = '满足诊断标准（建议复查确认）';
  }

  return {
    condition: 'diabetes',
    label: entry.label,
    icd10: entry.icd10,
    guideline: entry.guideline,
    diagnosed,
    severity,
    thresholdNote: diagnosed
      ? `命中：${hits.join('；')}`
      : `未命中切点（FPG≥${DM_THRESHOLDS.fastingGlucose}/2hPG≥${DM_THRESHOLDS.postprandial2h}/HbA1c≥${DM_THRESHOLDS.hba1c}%）`,
    observed,
  };
}

function assessChd(symText: string, history: GuideHistoryInput, lab: GuideLabResults): ConditionAssessment {
  const entry = GUIDELINE_BOOK.chd;
  const observed: Record<string, number | string | boolean> = {};
  const histText = [...(history.chronicDiseases ?? []), history.notes ?? ''].join(' ').toLowerCase();
  if (typeof lab.systolic === 'number') observed.systolic = lab.systolic;

  const typicalChestPain = /胸痛|胸闷/.test(symText) && /压榨|放射|活动|硝酸|持续/.test(symText);
  const riskFactors =
    (/高血压/.test(histText) ? 1 : 0) +
    (/糖尿病/.test(histText) ? 1 : 0) +
    (/高血脂|血脂异常/.test(histText) ? 1 : 0) +
    (history.smoking ? 1 : 0);

  // 保守诊断：典型缺血性胸痛 + ≥2 项危险因素，方提示冠心病可能
  const diagnosed = typicalChestPain && riskFactors >= 2;
  const severity = diagnosed
    ? `冠心病临床高度可能（典型胸痛+${riskFactors}项危险因素，建议心电图/肌钙蛋白/冠脉影像）`
    : typicalChestPain
      ? '胸痛症状存在但危险因素不足，建议完善检查鉴别'
      : '无典型缺血性胸痛表现';

  return {
    condition: 'chd',
    label: entry.label,
    icd10: entry.icd10,
    guideline: entry.guideline,
    diagnosed,
    severity,
    thresholdNote: typicalChestPain
      ? `典型缺血性胸痛命中；危险因素 ${riskFactors} 项（指南建议≥2项并结合客观检查）`
      : '未识别到典型缺血性胸痛关键词',
    observed: { ...observed, typicalChestPain, riskFactors },
  };
}

function assessPneumonia(symText: string, history: GuideHistoryInput, lab: GuideLabResults): ConditionAssessment {
  const entry = GUIDELINE_BOOK.pneumonia;
  const observed: Record<string, number | string | boolean> = {};
  const respiratorySymptom = /发热|咳嗽|咳痰|气促|呼吸困难/.test(symText);
  const infiltrate = lab.newInfiltrate === true;
  if (typeof lab.age === 'number') observed.age = lab.age;
  if (typeof lab.respiratoryRate === 'number') observed.respiratoryRate = lab.respiratoryRate;
  if (typeof lab.urea === 'number') observed.urea = lab.urea;
  if (lab.confusion === true) observed.confusion = true;

  // 诊断 = 呼吸道症状 + 新发浸润影（IDSA/ATS 必备影像条件）
  const diagnosed = respiratorySymptom && infiltrate;

  // CURB-65 评分
  let curb65 = 0;
  if (lab.confusion === true) curb65 += 1;
  if (typeof lab.urea === 'number' && lab.urea >= CAP_CURB65.ureaHigh) curb65 += 1;
  if (typeof lab.respiratoryRate === 'number' && lab.respiratoryRate >= CAP_CURB65.rrHigh) curb65 += 1;
  if (
    typeof lab.systolic === 'number' && lab.systolic < CAP_CURB65.sbpLow
  ) curb65 += 1;
  if (
    typeof lab.diastolic === 'number' && lab.diastolic <= CAP_CURB65.dbpLow
  ) curb65 += 1;
  if (typeof lab.age === 'number' && lab.age >= CAP_CURB65.ageHigh) curb65 += 1;

  let severity = '不满足诊断（缺影像新发浸润影）';
  if (diagnosed) {
    observed.curb65 = curb65;
    if (curb65 >= 3) severity = `重症肺炎可能（CURB-65=${curb65}，建议住院/ICU评估）`;
    else if (curb65 >= 2) severity = `建议住院（CURB-65=${curb65}）`;
    else severity = `门诊可处理（CURB-65=${curb65}）`;
  }

  return {
    condition: 'pneumonia',
    label: entry.label,
    icd10: entry.icd10,
    guideline: entry.guideline,
    diagnosed,
    severity,
    thresholdNote: respiratorySymptom
      ? `有呼吸道症状；新发浸润影=${infiltrate ? '是' : '否'}`
      : '未识别到呼吸道症状',
    observed,
  };
}

/* ---------------------------------------------------------------------------
 * 导出函数 1：指南对齐诊断
 * ------------------------------------------------------------------------ */

/**
 * 按四部权威指南硬阈值做诊断对齐评估（纯函数）。
 *
 * @param symptoms  症状列表（字符串或 {name,onset} 对象）
 * @param history   既往病史
 * @param labResults 检验/体征结构化结果
 */
export function guideBasedDiagnosis(
  symptoms: SymptomInput[],
  history: GuideHistoryInput = {},
  labResults: GuideLabResults = {},
): GuideDiagnosisResult {
  const symText = symptomsText(symptoms);
  const hist = history ?? {};
  const lab = labResults ?? {};

  const assessments: ConditionAssessment[] = [
    assessHypertension(lab),
    assessDiabetes(symText, lab),
    assessChd(symText, hist, lab),
    assessPneumonia(symText, hist, lab),
  ];

  // 首要命中诊断：优先级 冠心病>肺炎>高血压>糖尿病（急症优先）
  const priority: GuideConditionKey[] = ['chd', 'pneumonia', 'hypertension', 'diabetes'];
  let primary: ConditionAssessment | null = null;
  for (const key of priority) {
    const hit = assessments.find((a) => a.condition === key && a.diagnosed);
    if (hit) { primary = hit; break; }
  }

  return {
    assessments,
    primary,
    disclaimer:
      '本结果依据权威临床指南硬阈值自动生成，仅供执业医师参考，不构成诊断结论；诊断与处置须结合病史、查体及辅助检查综合判定。',
  };
}

/* ---------------------------------------------------------------------------
 * 导出函数 2：治疗方案是否符合指南
 * ------------------------------------------------------------------------ */

/** 解析病种键（支持传中文/英文/ICD） */
function resolveCondition(diagnosis: string): GuideConditionKey | null {
  const d = (diagnosis ?? '').trim().toLowerCase();
  if (!d) return null;
  if (/高血|hypertension|\bi10/.test(d)) return 'hypertension';
  if (/糖尿|diabet|\be11|hba1c|糖化/.test(d)) return 'diabetes';
  if (/冠心|冠脉|chd|acs|心绞痛|心梗|\bi2|\bi25/.test(d)) return 'chd';
  if (/肺炎|pneumonia|\bj1[0-9]/.test(d)) return 'pneumonia';
  return null;
}

/** 药物关键词命中判定 */
function drugHits(drugs: string[], kwList: string[]): boolean {
  const text = drugs.join(' ').toLowerCase();
  return kwList.some((kw) => text.includes(kw.toLowerCase()));
}

/**
 * 核查治疗方案是否符合指南一线治疗（纯函数）。
 *
 * @param diagnosis 诊断（病种名/ICD）
 * @param treatment 医生实际治疗方案
 */
export function checkTreatmentGuideline(
  diagnosis: string,
  treatment: TreatmentPlan = {},
): TreatmentCheck {
  const key = resolveCondition(diagnosis);
  const drugs = treatment.drugs ?? [];
  const interventions = treatment.interventions ?? [];
  const allText = [...drugs, ...interventions].join(' ').toLowerCase();
  const issues: TreatmentCheck['issues'] = [];

  if (!key) {
    return {
      condition: diagnosis,
      guideline: '未匹配到四部内置指南病种',
      compliant: false,
      requiredFirstLine: [],
      issues: [{ level: 'warning', message: `诊断「${diagnosis}」不在内置指南库（高血压/糖尿病/冠心病/肺炎）范围内` }],
      score: 0,
    };
  }

  const entry = GUIDELINE_BOOK[key];
  let score = 0;

  if (key === 'hypertension') {
    const hasLifestyle = /生活方式|限盐|运动/.test(allText);
    const hasAntihypertensive = drugHits(drugs, ['氨氯地平', '硝苯地平', '缬沙坦', '氯沙坦', '厄贝沙坦', '普利', 'ACEI', 'ARB', '噻嗪', '吲达帕胺', '利尿剂']);
    if (hasLifestyle) score += 20; else issues.push({ level: 'warning', message: '指南要求同步生活方式干预（限盐/运动/控体重）' });
    if (hasAntihypertensive) score += 60; else issues.push({ level: 'error', message: '达1级及以上高血压须启动指南推荐降压药（CCB/ACEI/ARB/噻嗪类利尿剂之一）' });
    if (/靶器官|心|肾|尿微量白蛋白/.test(allText)) score += 20; else issues.push({ level: 'info', message: '建议完善靶器官保护评估与监测' });
  } else if (key === 'diabetes') {
    const hasLifestyle = /生活方式|饮食|运动/.test(allText);
    const hasMetformin = drugHits(drugs, ['二甲双胍', 'metformin']);
    if (hasLifestyle) score += 20; else issues.push({ level: 'warning', message: '指南要求基础生活方式干预' });
    if (hasMetformin) score += 60; else issues.push({ level: 'error', message: '2型糖尿病一线用药为二甲双胍（无禁忌证时）' });
    if (/血糖监测|hba1c|糖化/.test(allText)) score += 20; else issues.push({ level: 'info', message: '建议 HbA1c 每3个月监测并筛查并发症' });
  } else if (key === 'chd') {
    const hasDAPT = drugHits(drugs, ['阿司匹林']) && drugHits(drugs, ['氯吡格雷', '替格瑞洛', 'p2y12']);
    const hasStatin = drugHits(drugs, ['他汀', '阿托伐他汀', '瑞舒伐他汀']);
    const hasBB = drugHits(drugs, ['美托洛尔', '比索洛尔', 'β受体', '洛尔']);
    if (hasDAPT) score += 40; else issues.push({ level: 'error', message: 'ACS/确诊冠心病须双联抗血小板（阿司匹林+P2Y12抑制剂）' });
    if (hasStatin) score += 30; else issues.push({ level: 'error', message: '冠心病二级预防须高强度他汀治疗' });
    if (hasBB) score += 20; else issues.push({ level: 'warning', message: '无禁忌者建议加用β受体阻滞剂' });
    if (/acei|arb|普利|沙坦/.test(allText)) score += 10; else issues.push({ level: 'info', message: '合并高血压/心衰者建议 ACEI/ARB' });
  } else if (key === 'pneumonia') {
    const hasAbx = drugHits(drugs, ['阿莫西林', '头孢', '大环内酯', '阿奇霉素', '克拉霉素', '左氧氟沙星', '莫西沙星', '呼吸喹诺酮', '青霉素']);
    const hasO2 = /氧疗|吸氧|气道/.test(allText);
    if (hasAbx) score += 60; else issues.push({ level: 'error', message: 'CAP 须按门诊/住院分层经验性抗感染' });
    if (hasO2) score += 20; else issues.push({ level: 'info', message: 'SpO₂<90% 应氧疗与气道管理' });
    if (/退热|化痰|补液|对症/.test(allText)) score += 20; else issues.push({ level: 'warning', message: '建议退热化痰等对症支持' });
  }

  score = Math.max(0, Math.min(100, score));
  return {
    condition: key,
    guideline: entry.guideline,
    compliant: score >= 80,
    requiredFirstLine: entry.firstLine,
    issues,
    score,
  };
}

/* ---------------------------------------------------------------------------
 * 导出函数 3：生成指南治疗建议
 * ------------------------------------------------------------------------ */

/**
 * 输出某诊断对应的指南级治疗建议（纯函数）。
 *
 * @param diagnosis 诊断（病种名/ICD）
 */
export function generateGuidelineSuggestion(diagnosis: string): GuidelineSuggestion | null {
  const key = resolveCondition(diagnosis);
  if (!key) return null;
  const e = GUIDELINE_BOOK[key];
  return {
    condition: key,
    label: e.label,
    icd10: e.icd10,
    guideline: e.guideline,
    diagnosisCriteria: e.diagnosisCriteria,
    firstLine: [...e.firstLine],
    targets: [...e.targets],
    monitoring: [...e.monitoring],
  };
}

/* ---------------------------------------------------------------------------
 * 导出函数 4：实际治疗 vs 指南治疗偏离分析
 * ------------------------------------------------------------------------ */

/**
 * 对比实际治疗与指南治疗，输出偏离项与整体对齐度（纯函数）。
 *
 * @param diagnosis          诊断
 * @param actualTreatment    实际治疗措施列表（药物/干预字符串）
 * @param guidelineTreatment  指南推荐治疗措施列表（通常取自 generateGuidelineSuggestion.firstLine）
 */
export function deviationFromGuideline(
  diagnosis: string,
  actualTreatment: string[] = [],
  guidelineTreatment: string[] = [],
): DeviationAnalysis {
  const key = resolveCondition(diagnosis);
  const actual = (actualTreatment ?? []).map((t) => t.trim()).filter(Boolean);
  const guideline = (guidelineTreatment ?? []).map((t) => t.trim()).filter(Boolean);
  const deviations: DeviationItem[] = [];

  const actualText = actual.join(' ').toLowerCase();

  // 指南要求但实际缺失的关键项（按病种挑"必选"核心）
  const mustHaves: Array<{ kw: string; label: string }> = [];
  if (key === 'hypertension') {
    mustHaves.push({ kw: '生活方式', label: '生活方式干预' });
    mustHaves.push({ kw: '氨氯地平|缬沙坦|氯沙坦|厄贝沙坦|普利|ACEI|ARB|噻嗪|吲达帕胺|利尿剂|CCB', label: '指南推荐降压药' });
  } else if (key === 'diabetes') {
    mustHaves.push({ kw: '二甲双胍|metformin', label: '二甲双胍一线' });
    mustHaves.push({ kw: '生活方式|饮食|运动', label: '生活方式干预' });
  } else if (key === 'chd') {
    mustHaves.push({ kw: '阿司匹林', label: '阿司匹林抗血小板' });
    mustHaves.push({ kw: '氯吡格雷|替格瑞洛|p2y12', label: 'P2Y12抑制剂（DAPT）' });
    mustHaves.push({ kw: '他汀', label: '高强度他汀' });
  } else if (key === 'pneumonia') {
    mustHaves.push({ kw: '阿莫西林|头孢|大环内酯|阿奇霉素|左氧氟沙星|莫西沙星|青霉素|喹诺酮', label: '经验性抗感染' });
  }

  for (const m of mustHaves) {
    const re = new RegExp(m.kw.toLowerCase());
    if (!re.test(actualText)) {
      deviations.push({
        type: 'missing',
        item: m.label,
        severity: 'major',
        message: `指南要求「${m.label}」，实际治疗中缺失`,
      });
    }
  }

  // 实际治疗里超指南/需警惕的项（简单黑名单：明确不推荐用于该病种）
  const blacklist: Array<{ kw: string; reason: string }> = [];
  if (key === 'pneumonia') {
    blacklist.push({ kw: '莫西沙星.*氨基糖苷', reason: 'CAP 不推荐常规联合氨基糖苷类（耳肾毒性，非必要）' });
  }
  if (key === 'hypertension') {
    blacklist.push({ kw: '硝苯地平普通片', reason: '不推荐硝苯地平普通片快速降压（血压波动风险）' });
  }
  for (const b of blacklist) {
    if (new RegExp(b.kw.toLowerCase()).test(actualText)) {
      deviations.push({ type: 'extra', item: b.kw.split('.*')[0], severity: 'minor', message: b.reason });
    }
  }

  // 指南治疗项的覆盖率
  if (guideline.length > 0) {
    const covered = guideline.filter((g) => {
      const head = g.replace(/[（(].*$/, '').trim().toLowerCase();
      return head.length >= 2 && actualText.includes(head.slice(0, 4));
    }).length;
    const coverage = covered / guideline.length;
    if (coverage < 0.5) {
      deviations.push({
        type: 'nonFirstLine',
        item: '一线治疗覆盖率',
        severity: 'minor',
        message: `指南一线治疗覆盖约 ${round2(coverage * 100)}%，建议对照指南补全`,
      });
    }
  }

  const major = deviations.filter((d) => d.severity === 'major').length;
  const overallAlignment: DeviationAnalysis['overallAlignment'] =
    major > 0 ? 'major' : deviations.length > 0 ? 'minor' : 'aligned';

  return {
    condition: key ?? diagnosis,
    deviations,
    deviationCount: deviations.length,
    overallAlignment,
  };
}
