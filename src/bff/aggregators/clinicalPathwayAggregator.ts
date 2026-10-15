/**
 * 健澜科技 jlmedaios — 临床路径智能推荐聚合器（M153-A）
 *
 * 【临床决策支持】CDS：
 *   1. recommendPathway(disease, patientAge, comorbidities) —— 按病种/年龄/共病推荐临床路径；
 *   2. deviationAnalysis(visitId, pathwayId)              —— 分析实际执行与推荐路径的偏离；
 *   3. getPathwayCost(pathwayId)                           —— 路径基准费用概算。
 *
 * 合规红线：
 *   - 路径为【推荐】而非强制，医师可根据实际情况偏离；
 *   - 推荐结果不替代医师临床判断，系统不自主开医嘱；
 *   - 所有出口均带免责声明「仅供参考，医生可根据实际情况偏离」。
 *
 * 覆盖病种：冠心病（支架/药物保守）/ 肺炎（CAP/HAP）/ 糖尿病（2型/妊娠）/ 胆囊切除术（腹腔镜）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ============================================================================
// 类型定义
// ============================================================================

/** 路径步骤（按天） */
export interface PathwayStep {
  day: number;
  name: string;
  action: string;
}

/** 费用明细项 */
export interface CostItem {
  name: string;
  amountCny: number;
}

/** 临床路径推荐结果（纯数据） */
export interface Pathway {
  pathwayId: string;
  pathwayCode: string;
  diseaseCategory: string;
  subtype: string;
  name: string;
  icdCode: string;
  standardLosDays: number;
  steps: PathwayStep[];
  costBreakdown: CostItem[];
  estimatedCostCny: number;
  /** 0–1，匹配置信度 */
  confidence: number;
  rationale: string[];
  /** 【临床决策支持】免责声明 */
  disclaimer: string;
}

/** 偏离明细 */
export interface DeviationItem {
  expected: string;
  actual: string;
  deviationType: string;
}

/** 路径偏离分析结果 */
export interface Deviation {
  visitId: string;
  pathwayId: string;
  isDeviated: boolean;
  /** 0–1，已偏离步骤 / 路径总步骤 */
  deviationRate: number;
  items: DeviationItem[];
  note: string;
}

/** 路径费用概算 */
export interface Cost {
  pathwayId: string;
  totalCny: number;
  items: CostItem[];
  estimatedDays: number;
  disclaimer: string;
}

// ============================================================================
// 常量
// ============================================================================

/** 【临床决策支持】统一免责声明：推荐不是强制，医生可偏离 */
export const PATHWAY_DISCLAIMER =
  '临床决策支持：本路径为推荐方案，仅供参考，医生可根据实际情况偏离；不替代医师临床判断。';

// ============================================================================
// 路径字典（与 deploy/postgres/init/308-clinical-pathway.sql 种子一致）
// ============================================================================

interface PathwayDictionaryEntry {
  pathwayId: string;
  pathwayCode: string;
  diseaseCategory: string;
  subtype: string;
  name: string;
  icdCode: string;
  standardLosDays: number;
  steps: PathwayStep[];
  costBreakdown: CostItem[];
}

const PATHWAY_DICTIONARY: ReadonlyArray<PathwayDictionaryEntry> = [
  {
    pathwayId: 'chd-stent',
    pathwayCode: 'CHD-PCI',
    diseaseCategory: 'coronary_heart_disease',
    subtype: 'stent',
    name: '冠心病（急性冠脉综合征）PCI支架置入临床路径',
    icdCode: 'I21.4',
    standardLosDays: 5,
    steps: [
      { day: 1, name: '入院评估', action: '心电图/心肌酶/BNP，术前谈话与知情同意' },
      { day: 1, name: '介入手术', action: '冠脉造影，必要时PCI支架置入' },
      { day: 2, name: '术后监护', action: '穿刺部位护理、心电血压监护，启动双联抗血小板' },
      { day: 3, name: '二级预防', action: '危险因素评估，β受体阻滞剂/他汀/ACEI滴定' },
      { day: 5, name: '出院', action: '出院指导（DAPT 12个月），心内科门诊随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 600 },
      { name: '检查费', amountCny: 1800 },
      { name: '药品费', amountCny: 2200 },
      { name: '手术操作费', amountCny: 9000 },
      { name: '耗材费(支架)', amountCny: 12000 },
      { name: '护理费', amountCny: 900 },
    ],
  },
  {
    pathwayId: 'chd-medical',
    pathwayCode: 'CHD-MED',
    diseaseCategory: 'coronary_heart_disease',
    subtype: 'medical',
    name: '冠心病（稳定型/高出血风险）药物保守治疗临床路径',
    icdCode: 'I25.1',
    standardLosDays: 7,
    steps: [
      { day: 1, name: '入院评估', action: '心电图/心肌酶/心脏超声，危险分层' },
      { day: 2, name: '抗缺血治疗', action: '硝酸酯+β受体阻滞剂，必要时抗凝' },
      { day: 4, name: '风险复核', action: '评估是否具备介入指征，多学科会诊' },
      { day: 6, name: '心脏康复', action: '运动耐量评估与康复指导' },
      { day: 7, name: '出院', action: '二级预防用药处方，社区随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 840 },
      { name: '检查费', amountCny: 1500 },
      { name: '药品费', amountCny: 3500 },
      { name: '操作费(造影可选)', amountCny: 3000 },
      { name: '护理费', amountCny: 1000 },
    ],
  },
  {
    pathwayId: 'pneum-cap',
    pathwayCode: 'PNEUM-CAP',
    diseaseCategory: 'pneumonia',
    subtype: 'cap',
    name: '社区获得性肺炎（CAP）临床路径',
    icdCode: 'J15.9',
    standardLosDays: 7,
    steps: [
      { day: 1, name: '入院评估', action: '血常规/CRP/PCT/胸部CT，CURB-65评分' },
      { day: 2, name: '经验抗感染', action: '指南推荐经验性抗菌治疗，48-72h复评' },
      { day: 4, name: '疗效评估', action: '病原学回报后目标治疗，降阶梯' },
      { day: 6, name: '康复', action: '体温正常、影像学吸收评估' },
      { day: 7, name: '出院', action: '口服序贯疗程，呼吸科门诊随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 840 },
      { name: '检查费', amountCny: 1600 },
      { name: '药品费(抗菌)', amountCny: 2600 },
      { name: '护理费', amountCny: 900 },
      { name: '耗材费', amountCny: 560 },
    ],
  },
  {
    pathwayId: 'pneum-hap',
    pathwayCode: 'PNEUM-HAP',
    diseaseCategory: 'pneumonia',
    subtype: 'hap',
    name: '医院获得性肺炎（HAP/VAP）临床路径',
    icdCode: 'J95.8',
    standardLosDays: 10,
    steps: [
      { day: 1, name: '院内评估', action: '痰培养/血培养/胸部影像，MRSA/铜绿风险分层' },
      { day: 2, name: '经验治疗', action: '抗MRSA/抗铜绿经验治疗，集束化护理' },
      { day: 5, name: '病原复评', action: '培养结果回报后降阶梯，呼吸机相关肺炎Bundle' },
      { day: 8, name: '撤机评估', action: '脱机条件评估，口腔护理与抬高床头' },
      { day: 10, name: '出院/转归', action: '疗程总结，感染科随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 1400 },
      { name: '检查费', amountCny: 2600 },
      { name: '药品费(广谱抗菌)', amountCny: 5200 },
      { name: '护理费', amountCny: 1800 },
      { name: '耗材费', amountCny: 1000 },
    ],
  },
  {
    pathwayId: 'dm-type2',
    pathwayCode: 'DM-T2',
    diseaseCategory: 'diabetes_mellitus',
    subtype: 'type2',
    name: '2型糖尿病血糖调控临床路径',
    icdCode: 'E11.9',
    standardLosDays: 8,
    steps: [
      { day: 1, name: '入院评估', action: 'HbA1c/C肽/并发症筛查，低血糖风险评估' },
      { day: 2, name: '方案制定', action: '个体化降糖方案（口服/胰岛素），医学营养治疗' },
      { day: 4, name: '血糖监测', action: '七段血糖谱调药，低血糖宣教' },
      { day: 7, name: '并发症管理', action: '眼底/尿微量白蛋白/足部筛查' },
      { day: 8, name: '出院', action: '自我血糖监测教育，内分泌门诊随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 960 },
      { name: '检查费', amountCny: 2200 },
      { name: '药品费', amountCny: 2400 },
      { name: '护理费', amountCny: 1000 },
      { name: '耗材费(血糖试条)', amountCny: 640 },
    ],
  },
  {
    pathwayId: 'dm-gestational',
    pathwayCode: 'DM-GDM',
    diseaseCategory: 'diabetes_mellitus',
    subtype: 'gestational',
    name: '妊娠糖尿病（GDM）临床路径',
    icdCode: 'O24.4',
    standardLosDays: 5,
    steps: [
      { day: 1, name: '妊娠评估', action: 'OGTT复核、胎儿超声、产科+内分泌共管' },
      { day: 2, name: '医学营养治疗', action: '营养师制定食谱，血糖自我监测' },
      { day: 3, name: '药物治疗', action: '血糖不达标起始胰岛素（妊娠期安全）' },
      { day: 4, name: '胎儿监护', action: '胎心监护，评估分娩时机' },
      { day: 5, name: '出院', action: '产后6-12周复查OGTT，母婴随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 700 },
      { name: '检查费', amountCny: 1800 },
      { name: '药品费(胰岛素)', amountCny: 1500 },
      { name: '护理费', amountCny: 1200 },
      { name: '耗材费', amountCny: 600 },
    ],
  },
  {
    pathwayId: 'chole-laparoscopic',
    pathwayCode: 'CHOLE-LAP',
    diseaseCategory: 'cholecystectomy',
    subtype: 'laparoscopic',
    name: '腹腔镜胆囊切除术临床路径',
    icdCode: 'K80.2',
    standardLosDays: 4,
    steps: [
      { day: 1, name: '术前评估', action: '腹部超声/肝功能/凝血，术前谈话' },
      { day: 2, name: '手术', action: '腹腔镜胆囊切除术（LC），术中胆道造影按需' },
      { day: 3, name: '术后观察', action: '排气恢复、切口护理、早期下床' },
      { day: 4, name: '出院', action: '低脂饮食指导，普外科门诊随访' },
    ],
    costBreakdown: [
      { name: '床位费', amountCny: 480 },
      { name: '检查费', amountCny: 1200 },
      { name: '麻醉手术费', amountCny: 5600 },
      { name: '药品费', amountCny: 1500 },
      { name: '耗材费', amountCny: 1800 },
      { name: '护理费', amountCny: 420 },
    ],
  },
];

function findEntry(pathwayId: string): PathwayDictionaryEntry {
  const entry = PATHWAY_DICTIONARY.find((p) => p.pathwayId === pathwayId);
  if (!entry) {
    throw new ClinicalPathwayError(404, 'PATHWAY_NOT_FOUND', `未找到临床路径: ${pathwayId}`);
  }
  return entry;
}

function sumCost(items: CostItem[]): number {
  return Math.round(items.reduce((acc, it) => acc + (Number.isFinite(it.amountCny) ? it.amountCny : 0), 0));
}

// ============================================================================
// 偏离登记（模块级可注入状态：路由层/测试层 seed 后由 deviationAnalysis 读取）
// ============================================================================

interface RecordedDeviation {
  expectedStep: string;
  actualAction: string;
  deviationType: string;
}

const deviationStore = new Map<string, RecordedDeviation[]>();

/** 生成登记键 */
function deviationKey(visitId: string, pathwayId: string): string {
  return `${visitId}::${pathwayId}`;
}

/**
 * 【临床决策支持】登记一条实际执行偏离。
 * 由路由层在记录偏离时调用；纯函数本身不读写数据库。
 */
export function recordPathwayDeviation(
  visitId: string,
  pathwayId: string,
  actualAction: string,
  deviationType = 'clinical_judgement',
): void {
  if (!visitId || !pathwayId) return;
  const key = deviationKey(visitId, pathwayId);
  const list = deviationStore.get(key) ?? [];
  // 期望步骤名按实际动作语义取空，由 deviationAnalysis 按索引对齐路径步骤
  list.push({ expectedStep: '', actualAction, deviationType });
  deviationStore.set(key, list);
}

/** 测试辅助：清空偏离登记 */
export function clearPathwayDeviations(): void {
  deviationStore.clear();
}

// ============================================================================
// 纯函数：推荐路径
// ============================================================================

type DiseaseCategory = 'coronary_heart_disease' | 'pneumonia' | 'diabetes_mellitus' | 'cholecystectomy';

function classifyDisease(disease: string): DiseaseCategory | null {
  const d = (disease || '').toLowerCase();
  if (/冠心病|心肌梗死|心梗|心绞痛|冠脉|chd|coronary|acs|stemi|nste/.test(d)) return 'coronary_heart_disease';
  if (/肺炎|肺部感染|cap|hap|vap|pneumon|lung infection/.test(d)) return 'pneumonia';
  if (/糖尿病|dm|diabet|gdm/.test(d)) return 'diabetes_mellitus';
  if (/胆囊|cholecyst|lc|胆囊炎|胆结石/.test(d)) return 'cholecystectomy';
  return null;
}

function hasComorbidity(comorbidities: string[], pattern: RegExp): boolean {
  return comorbidities.some((c) => pattern.test((c || '').toLowerCase()));
}

function pickSubtype(
  category: DiseaseCategory,
  disease: string,
  patientAge: number,
  comorbidities: string[],
): { pathwayId: string; confidence: number; rationale: string[] } {
  const d = (disease || '').toLowerCase();
  const rationale: string[] = [];

  if (category === 'coronary_heart_disease') {
    if (/支架|pci|介入|stent|冠脉造影阳性/.test(d)) {
      rationale.push('诊断文本明确指向 PCI/支架置入，命中介入路径');
      return { pathwayId: 'chd-stent', confidence: 0.92, rationale };
    }
    if (/保守|药物治疗|内科治疗|medical|服药治疗/.test(d)) {
      rationale.push('诊断文本明确为药物保守治疗');
      return { pathwayId: 'chd-medical', confidence: 0.9, rationale };
    }
    // 默认：高龄或高出血/心衰/肾衰共病 → 保守；否则倾向介入
    if ((patientAge || 0) >= 80 || hasComorbidity(comorbidities, /心衰|心功能不全|肾衰|肾功能不全|出血倾向|肿瘤晚期/)) {
      rationale.push(`患者年龄 ${patientAge} 岁或合并严重共病，出血/手术风险高，倾向药物保守`);
      return { pathwayId: 'chd-medical', confidence: 0.72, rationale };
    }
    rationale.push('未明示治疗方式，按急性冠脉综合征常规倾向介入路径');
    return { pathwayId: 'chd-stent', confidence: 0.7, rationale };
  }

  if (category === 'pneumonia') {
    if (/hap|医院获得性|院内感染|nosocomial|vap/.test(d)) {
      rationale.push('诊断文本明确为医院获得性肺炎');
      return { pathwayId: 'pneum-hap', confidence: 0.92, rationale };
    }
    if (/cap|社区获得性/.test(d)) {
      rationale.push('诊断文本明确为社区获得性肺炎');
      return { pathwayId: 'pneum-cap', confidence: 0.92, rationale };
    }
    if (hasComorbidity(comorbidities, /卧床|气管插管|机械通气|icu|住院超过48小时|住院≥48h/)) {
      rationale.push('患者存在院内感染高危因素（卧床/机械通气/ICU），按 HAP 处理');
      return { pathwayId: 'pneum-hap', confidence: 0.72, rationale };
    }
    rationale.push('未明示感染场所，默认按社区获得性肺炎处理');
    return { pathwayId: 'pneum-cap', confidence: 0.7, rationale };
  }

  if (category === 'diabetes_mellitus') {
    if (/妊娠|孕期|gestational|gdm|孕妇|产前|围产/.test(d)) {
      rationale.push('诊断文本明确为妊娠糖尿病，产科与内分泌共管');
      return { pathwayId: 'dm-gestational', confidence: 0.93, rationale };
    }
    rationale.push('默认按2型糖尿病血糖调控路径处理');
    return { pathwayId: 'dm-type2', confidence: 0.85, rationale };
  }

  // cholecystectomy：默认腹腔镜
  if (/开腹|open|中转开腹|oc/.test(d)) {
    rationale.push('诊断文本指向开腹手术，仍以腹腔镜路径为基线，术中按实际情况中转');
  } else {
    rationale.push('胆囊切除术首选腹腔镜路径（LC）');
  }
  return { pathwayId: 'chole-laparoscopic', confidence: 0.88, rationale };
}

/**
 * 【临床决策支持】根据诊断、年龄、共病推荐临床路径。
 *
 * @param disease        诊断文本（自然语言，中英文均可）
 * @param patientAge     患者年龄（岁）
 * @param comorbidities  共病列表
 * @returns Pathway 完整路径定义 + 置信度 + 理由 + 免责声明
 * @throws ClinicalPathwayError 未识别病种时抛出
 */
export function recommendPathway(
  disease: string,
  patientAge: number,
  comorbidities: string[],
): Pathway {
  const category = classifyDisease(disease);
  if (!category) {
    throw new ClinicalPathwayError(
      400,
      'UNSUPPORTED_DISEASE',
      `暂不支持的病种：${disease || '(空)'}。当前覆盖：冠心病/肺炎/糖尿病/胆囊切除术`,
    );
  }
  const safeAge = Number.isFinite(patientAge) ? Math.max(0, Math.round(patientAge)) : 0;
  const safeComorbidities = Array.isArray(comorbidities) ? comorbidities : [];
  const picked = pickSubtype(category, disease, safeAge, safeComorbidities);
  const entry = findEntry(picked.pathwayId);
  const total = sumCost(entry.costBreakdown);

  return {
    pathwayId: entry.pathwayId,
    pathwayCode: entry.pathwayCode,
    diseaseCategory: entry.diseaseCategory,
    subtype: entry.subtype,
    name: entry.name,
    icdCode: entry.icdCode,
    standardLosDays: entry.standardLosDays,
    steps: entry.steps,
    costBreakdown: entry.costBreakdown,
    estimatedCostCny: total,
    confidence: picked.confidence,
    rationale: picked.rationale,
    disclaimer: PATHWAY_DISCLAIMER,
  };
}

// ============================================================================
// 纯函数：偏离分析
// ============================================================================

/**
 * 【临床决策支持】分析指定就诊对指定路径的偏离情况。
 * 纯函数：从模块级登记中读取该就诊已记录的偏离，与路径步骤对齐后计算偏离率。
 *
 * @param visitId    就诊ID
 * @param pathwayId  路径ID
 */
export function deviationAnalysis(visitId: string, pathwayId: string): Deviation {
  if (!visitId) throw new ClinicalPathwayError(400, 'INVALID_VISIT', 'visitId 不能为空');
  const entry = findEntry(pathwayId);
  const recorded = deviationStore.get(deviationKey(visitId, pathwayId)) ?? [];
  const totalSteps = Math.max(1, entry.steps.length);

  if (recorded.length === 0) {
    return {
      visitId,
      pathwayId,
      isDeviated: false,
      deviationRate: 0,
      items: [],
      note: '本就诊暂未记录路径偏离，按推荐路径执行',
    };
  }

  const items: DeviationItem[] = recorded.map((r, idx) => ({
    expected: entry.steps[idx]?.name ?? '路径外处置',
    actual: r.actualAction,
    deviationType: r.deviationType,
  }));
  const rate = Math.max(0, Math.min(1, Math.round((recorded.length / totalSteps) * 1000) / 1000));

  return {
    visitId,
    pathwayId,
    isDeviated: true,
    deviationRate: rate,
    items,
    note: rate >= 0.5 ? '偏离率较高，建议多学科复核' : '存在有限偏离，属医师临床判断范围',
  };
}

// ============================================================================
// 纯函数：路径费用概算
// ============================================================================

/**
 * 【临床决策支持】返回指定路径的基准费用概算。
 * 费用为医保基准参考值，非实际收费；医师可根据病情调整。
 */
export function getPathwayCost(pathwayId: string): Cost {
  const entry = findEntry(pathwayId);
  return {
    pathwayId: entry.pathwayId,
    totalCny: sumCost(entry.costBreakdown),
    items: entry.costBreakdown,
    estimatedDays: entry.standardLosDays,
    disclaimer: PATHWAY_DISCLAIMER,
  };
}

// ============================================================================
// 视图层错误
// ============================================================================

export class ClinicalPathwayError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ClinicalPathwayError';
  }
}
