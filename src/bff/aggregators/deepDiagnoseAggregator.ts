/**
 * ============================================================================
 * AI 辅助诊断深化（M154-A）：深度诊断聚合器
 * ----------------------------------------------------------------------------
 * 【AI深化与运营预测】
 *   在 M144-A 初筛（Top3）基础上，把诊断能力下沉到「专科病种库」级：
 *     - deepDiagnose：综合患者特征 / 症状 / 病史，输出 Top5 可能诊断；
 *     - differentialDiagnosis：结合病程与严重度，输出带鉴别要点的鉴别诊断；
 *     - suggestLabTests / suggestImaging：按诊断反查建议检验与影像。
 *
 * 病种库（16 种，覆盖四大系统）：
 *   呼吸：肺炎 / 哮喘 / COPD / 肺栓塞
 *   消化：胃炎 / 胆囊炎 / 胰腺炎 / 消化道出血
 *   心血管：冠心病 / 心衰 / 心律失常 / 高血压急症
 *   内分泌：糖尿病 / 甲亢 / 甲减 / 肾上腺疾病
 *
 * 医疗安全红线（AI 只是辅助，最终由医生确认）：
 *   - 所有输出均为规则引擎启发式建议，不构成诊断结论；
 *   - 返回体固定携带 disclaimer「辅助诊断，最终由医生确认」；
 *   - 纯函数、无 I/O、无随机（仅 generatedAt 取当前时间），不落库、不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/** 性别 */
export type DeepGender = 'male' | 'female' | '';

/** 专科归属 */
export type Specialty = '呼吸' | '消化' | '心血管' | '内分泌';

/** 生命体征 */
export interface DeepVitals {
  /** 体温 ℃ */
  temperature?: number;
  /** 收缩压 mmHg */
  systolic?: number;
  /** 舒张压 mmHg */
  diastolic?: number;
  /** 心率 次/分 */
  heartRate?: number;
  /** 血氧饱和度 % */
  spo2?: number;
}

/** 患者特征 */
export interface PatientFeatures {
  age?: number;
  gender?: DeepGender;
  vitals?: DeepVitals;
}

/** 单条症状输入 */
export interface DeepSymptom {
  /** 症状名，如 胸痛 */
  name: string;
  /** 起病特点描述（参与关键词匹配），如 压榨样、向背部放射 */
  onset?: string;
}

/** 既往病史 */
export interface DeepHistory {
  chronicDiseases?: string[];
  smoking?: boolean;
  notes?: string;
}

/** Top5 单个候选诊断 */
export interface DeepCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: Specialty;
  /** 置信度 0~1，按降序，封顶 0.95 */
  confidence: number;
  /** 支持依据（命中症状 / 体征 / 人群 / 病史） */
  evidence: string[];
}

/** 鉴别诊断条目 */
export interface Differential {
  rank: number;
  diagnosis: string;
  icd10: string;
  specialty: Specialty;
  /** 与主诊断的鉴别要点（如何区分） */
  discriminator: string;
  /** 可能性 0~1 */
  likelihood: number;
}

/** 建议检验 */
export interface LabTest {
  name: string;
  priority: 'urgent' | 'routine';
  rationale: string;
}

/** 建议影像 */
export interface Imaging {
  modality: string;
  bodyPart: string;
  urgency: 'stat' | 'urgent' | 'routine';
  rationale: string;
}

/** 风险提示 */
export interface DeepRisk {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}

/** deepDiagnose 返回体 */
export interface DeepDiagnosis {
  deepId: string;
  topCandidates: DeepCandidate[];
  differential: Differential[];
  labTests: LabTest[];
  imaging: Imaging[];
  riskWarnings: DeepRisk[];
  generatedAt: string;
  /** 固定免责声明 */
  disclaimer: string;
}

/* ---------------------------------------------------------------------------
 * 内置病种规则库（启发式权重，非确诊）
 * ------------------------------------------------------------------------ */
interface DiseaseRule {
  diagnosis: string;
  icd10: string;
  specialty: Specialty;
  base: number;
  symptoms: Array<{ kw: string; weight: number; label: string }>;
  /** 体征提示：key 取自 DeepVitals，operator 与阈值 */
  vitals?: Array<{
    field: keyof DeepVitals;
    op: '>=' | '<=';
    threshold: number;
    weight: number;
    label: string;
  }>;
  /** 年龄带修正 */
  ageBand?: { minAge: number; maxAge: number; weight: number; label: string };
  /** 病史关键词 */
  history: Array<{ kw: string; weight: number; label: string }>;
  labs: Array<Omit<LabTest, 'priority'> & { priority: LabTest['priority'] }>;
  imaging: Imaging[];
  /** 与主诊断的鉴别要点 */
  discriminator: string;
}

const DISEASE_LIBRARY: DiseaseRule[] = [
  // ===================== 呼吸 =====================
  {
    diagnosis: '社区获得性肺炎', icd10: 'J18.900', specialty: '呼吸', base: 0.1,
    symptoms: [
      { kw: '发热', weight: 0.3, label: '发热' },
      { kw: '咳嗽', weight: 0.3, label: '咳嗽' },
      { kw: '咳痰', weight: 0.35, label: '咳痰' },
      { kw: '脓痰', weight: 0.3, label: '咳脓痰' },
      { kw: '气促', weight: 0.3, label: '气促' },
    ],
    vitals: [
      { field: 'temperature', op: '>=', threshold: 37.3, weight: 0.15, label: '体温升高' },
      { field: 'spo2', op: '<=', threshold: 93, weight: 0.2, label: 'SpO₂≤93%' },
    ],
    ageBand: { minAge: 65, maxAge: 150, weight: 0.1, label: '老年肺炎高危' },
    history: [{ kw: 'COPD', weight: 0.12, label: '合并 COPD' }],
    labs: [
      { name: '血常规+CRP+PCT', priority: 'urgent', rationale: '判断感染程度与细菌/病毒倾向' },
      { name: '痰培养+药敏', priority: 'routine', rationale: '明确致病菌并指导抗生素' },
      { name: '动脉血气分析', priority: 'urgent', rationale: '低氧/气促者评估氧合与通气' },
    ],
    imaging: [
      { modality: '胸部CT', bodyPart: '胸部', urgency: 'urgent', rationale: '定位炎症灶、评估范围' },
    ],
    discriminator: '与哮喘急性发作鉴别：肺炎有发热/脓痰/影像实变，哮喘以反复发作性喘息为主',
  },
  {
    diagnosis: '支气管哮喘急性发作', icd10: 'J45.x00', specialty: '呼吸', base: 0.1,
    symptoms: [
      { kw: '喘息', weight: 0.5, label: '喘息/呼气性呼吸困难' },
      { kw: '呼吸困难', weight: 0.25, label: '呼吸困难' },
      { kw: '夜间', weight: 0.2, label: '夜间或接触过敏原后发作' },
      { kw: '咳嗽', weight: 0.15, label: '咳嗽变异性表现' },
    ],
    vitals: [{ field: 'spo2', op: '<=', threshold: 93, weight: 0.15, label: '发作时低氧' }],
    history: [
      { kw: '哮喘', weight: 0.3, label: '既往哮喘史' },
      { kw: '过敏', weight: 0.15, label: '过敏体质/过敏原' },
    ],
    labs: [
      { name: '血常规嗜酸性粒细胞', priority: 'routine', rationale: '评估过敏炎症' },
      { name: '血清总IgE', priority: 'routine', rationale: '支持过敏性气道炎症' },
      { name: '支气管舒张试验', priority: 'routine', rationale: '验证气流可逆性' },
    ],
    imaging: [
      { modality: '胸片', bodyPart: '胸部', urgency: 'routine', rationale: '排除肺炎/气胸等其他喘息病因' },
    ],
    discriminator: '与肺炎鉴别：哮喘多无发热脓痰、有既往发作史，支气管舒张试验阳性',
  },
  {
    diagnosis: '慢性阻塞性肺疾病急性加重', icd10: 'J44.100', specialty: '呼吸', base: 0.1,
    symptoms: [
      { kw: '咳痰', weight: 0.25, label: '长期慢性咳痰' },
      { kw: '气促', weight: 0.4, label: '活动后气促加重' },
      { kw: '呼吸困难', weight: 0.25, label: '呼吸困难' },
      { kw: '吸烟', weight: 0.15, label: '长期吸烟史' },
    ],
    vitals: [{ field: 'spo2', op: '<=', threshold: 92, weight: 0.2, label: 'SpO₂≤92%' }],
    ageBand: { minAge: 50, maxAge: 150, weight: 0.1, label: '中老年好发' },
    history: [
      { kw: 'COPD', weight: 0.35, label: '既往 COPD' },
      { kw: '吸烟', weight: 0.15, label: '吸烟' },
    ],
    labs: [
      { name: '动脉血气分析', priority: 'urgent', rationale: '评估Ⅱ型呼衰与CO₂潴留' },
      { name: '血常规+CRP', priority: 'routine', rationale: '识别诱发感染' },
      { name: '肺功能(稳定期复查)', priority: 'routine', rationale: '气流受限程度分级' },
    ],
    imaging: [
      { modality: '胸部CT', bodyPart: '胸部', urgency: 'routine', rationale: '排除气胸、肺炎等加重诱因' },
    ],
    discriminator: '与肺炎鉴别：COPD为长期吸烟/慢性咳痰基础上的急性加重，影像以肺气肿改变为主',
  },
  {
    diagnosis: '急性肺栓塞', icd10: 'I26.900', specialty: '呼吸', base: 0.1,
    symptoms: [
      { kw: '呼吸困难', weight: 0.45, label: '突发呼吸困难' },
      { kw: '胸痛', weight: 0.3, label: '胸膜性胸痛' },
      { kw: '咯血', weight: 0.45, label: '咯血' },
      { kw: '晕厥', weight: 0.25, label: '晕厥' },
    ],
    vitals: [
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.15, label: '心动过速' },
      { field: 'spo2', op: '<=', threshold: 93, weight: 0.2, label: '低氧' },
    ],
    history: [
      { kw: '手术', weight: 0.15, label: '近期手术/卧床' },
      { kw: '肿瘤', weight: 0.1, label: '肿瘤高凝状态' },
      { kw: '下肢静脉', weight: 0.15, label: '下肢深静脉血栓史' },
    ],
    labs: [
      { name: 'D-二聚体', priority: 'urgent', rationale: '排除低危肺栓塞' },
      { name: '动脉血气分析', priority: 'urgent', rationale: '评估低氧与肺泡-动脉氧分压差' },
      { name: '肌钙蛋白/BNP', priority: 'routine', rationale: '评估右心负荷与危险分层' },
    ],
    imaging: [
      { modality: 'CT肺动脉造影(CTPA)', bodyPart: '胸部肺动脉', urgency: 'stat', rationale: '确诊肺栓塞的首选影像' },
    ],
    discriminator: '与冠心病鉴别：肺栓塞为突发呼吸困难+胸痛+咯血+低氧，心电图无典型缺血演变',
  },
  // ===================== 消化 =====================
  {
    diagnosis: '慢性胃炎', icd10: 'K29.500', specialty: '消化', base: 0.1,
    symptoms: [
      { kw: '上腹痛', weight: 0.4, label: '上腹隐痛/灼痛' },
      { kw: '腹胀', weight: 0.3, label: '餐后饱胀' },
      { kw: '嗳气', weight: 0.35, label: '嗳气反酸' },
      { kw: '恶心', weight: 0.15, label: '恶心' },
    ],
    history: [],
    labs: [
      { name: '幽门螺杆菌(C13/C14)呼气试验', priority: 'routine', rationale: '明确Hp感染' },
      { name: '胃镜+活检', priority: 'routine', rationale: '确诊胃炎并排除溃疡/肿瘤' },
    ],
    imaging: [
      { modality: '腹部超声', bodyPart: '肝胆胰', urgency: 'routine', rationale: '排除肝胆胰器质性病变' },
    ],
    discriminator: '与胆囊炎鉴别：胃炎与进食/空腹相关、无墨菲征及放射痛',
  },
  {
    diagnosis: '急性胆囊炎', icd10: 'K81.000', specialty: '消化', base: 0.1,
    symptoms: [
      { kw: '右上腹痛', weight: 0.5, label: '右上腹痛' },
      { kw: '恶心', weight: 0.2, label: '恶心呕吐' },
      { kw: '发热', weight: 0.25, label: '发热' },
      { kw: '油腻', weight: 0.25, label: '油腻饮食诱发' },
    ],
    vitals: [{ field: 'temperature', op: '>=', threshold: 37.5, weight: 0.1, label: '低热/发热' }],
    history: [{ kw: '胆结石', weight: 0.25, label: '胆囊结石史' }],
    labs: [
      { name: '血常规+CRP', priority: 'urgent', rationale: '评估感染程度' },
      { name: '肝功能(胆红素/ALP/GGT)', priority: 'urgent', rationale: '评估胆道梗阻' },
      { name: '血淀粉酶/脂肪酶', priority: 'routine', rationale: '排除合并胰腺炎' },
    ],
    imaging: [
      { modality: '腹部超声', bodyPart: '胆囊', urgency: 'urgent', rationale: '胆囊增大/壁增厚/结石/墨菲征超声阳性' },
    ],
    discriminator: '与胰腺炎鉴别：胆囊炎右上腹为主、Murphy征阳性，淀粉酶一般不显著升高',
  },
  {
    diagnosis: '急性胰腺炎', icd10: 'K85.900', specialty: '消化', base: 0.1,
    symptoms: [
      { kw: '腹痛', weight: 0.3, label: '中上腹剧痛' },
      { kw: '腰背部', weight: 0.45, label: '向腰背部放射' },
      { kw: '呕吐', weight: 0.25, label: '频繁呕吐' },
      { kw: '饮酒', weight: 0.2, label: '饮酒/暴饮暴食后' },
    ],
    vitals: [{ field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' }],
    history: [{ kw: '胆结石', weight: 0.2, label: '胆源性(胆结石)' }],
    labs: [
      { name: '血淀粉酶/脂肪酶', priority: 'urgent', rationale: '脂肪酶≥3倍上限支持诊断' },
      { name: '血钙/血糖/乳酸', priority: 'urgent', rationale: '评估病情严重度' },
      { name: '肝功能+血脂', priority: 'routine', rationale: '排查胆源性与高脂血症性' },
    ],
    imaging: [
      { modality: '腹部CT平扫+增强', bodyPart: '胰腺', urgency: 'urgent', rationale: '评估胰腺坏死/渗出' },
    ],
    discriminator: '与消化道溃疡穿孔鉴别：胰腺炎淀粉酶显著升高、腹痛向腰背放射',
  },
  {
    diagnosis: '急性上消化道出血', icd10: 'K92.200', specialty: '消化', base: 0.1,
    symptoms: [
      { kw: '呕血', weight: 0.55, label: '呕血/咖啡渣样物' },
      { kw: '黑便', weight: 0.45, label: '柏油样黑便' },
      { kw: '便血', weight: 0.2, label: '便血' },
      { kw: '头晕', weight: 0.2, label: '头晕/乏力' },
    ],
    vitals: [
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.15, label: '心动过速' },
      { field: 'systolic', op: '<=', threshold: 90, weight: 0.2, label: '低血压/休克倾向' },
    ],
    history: [
      { kw: '溃疡', weight: 0.2, label: '消化性溃疡史' },
      { kw: '肝病', weight: 0.2, label: '肝硬化(静脉曲张)' },
    ],
    labs: [
      { name: '血常规(Hb/Hct)', priority: 'urgent', rationale: '评估失血程度' },
      { name: '血型鉴定+交叉配血', priority: 'urgent', rationale: '备血输血准备' },
      { name: '凝血功能+尿素氮', priority: 'routine', rationale: 'BUN/Cr升高支持上消化道出血' },
    ],
    imaging: [
      { modality: '急诊胃镜', bodyPart: '上消化道', urgency: 'stat', rationale: '定位出血灶并可内镜下止血' },
    ],
    discriminator: '与下消化道出血鉴别：呕血/黑便+BUN升高提示上消化道来源',
  },
  // ===================== 心血管 =====================
  {
    diagnosis: '冠心病(急性冠脉综合征)', icd10: 'I21.x00', specialty: '心血管', base: 0.1,
    symptoms: [
      { kw: '胸痛', weight: 0.45, label: '胸骨后压榨样胸痛' },
      { kw: '胸闷', weight: 0.3, label: '胸闷' },
      { kw: '放射', weight: 0.35, label: '向左肩背/下颌放射' },
      { kw: '大汗', weight: 0.25, label: '伴大汗/濒死感' },
    ],
    vitals: [
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' },
    ],
    ageBand: { minAge: 45, maxAge: 150, weight: 0.12, label: '≥45岁心血管高危带' },
    history: [
      { kw: '高血压', weight: 0.12, label: '高血压' },
      { kw: '糖尿病', weight: 0.12, label: '糖尿病' },
      { kw: '吸烟', weight: 0.1, label: '吸烟' },
    ],
    labs: [
      { name: '高敏肌钙蛋白(cTnI)', priority: 'urgent', rationale: '确诊心肌坏死的核心指标' },
      { name: '心肌酶谱/BNP', priority: 'routine', rationale: '评估心梗范围与心功能' },
      { name: '血脂+血糖+肾功能', priority: 'routine', rationale: '危险分层与二级预防' },
    ],
    imaging: [
      { modality: '12/18导联心电图', bodyPart: '心脏', urgency: 'stat', rationale: '缺血/梗死定位' },
      { modality: '冠脉CTA/造影', bodyPart: '冠脉', urgency: 'urgent', rationale: '明确狭窄部位与程度' },
    ],
    discriminator: '与肺栓塞鉴别：ACS胸痛与活动相关、心电图ST-T动态演变、肌钙蛋白升高',
  },
  {
    diagnosis: '急性心力衰竭', icd10: 'I50.900', specialty: '心血管', base: 0.1,
    symptoms: [
      { kw: '呼吸困难', weight: 0.4, label: '活动后/夜间阵发性呼吸困难' },
      { kw: '端坐呼吸', weight: 0.4, label: '端坐呼吸' },
      { kw: '水肿', weight: 0.35, label: '下肢凹陷性水肿' },
      { kw: '咳嗽', weight: 0.15, label: '粉红色泡沫痰' },
    ],
    vitals: [
      { field: 'spo2', op: '<=', threshold: 93, weight: 0.15, label: '低氧' },
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' },
    ],
    history: [
      { kw: '高血压', weight: 0.15, label: '高血压性心脏病' },
      { kw: '冠心病', weight: 0.15, label: '缺血性心肌病' },
    ],
    labs: [
      { name: 'BNP/NT-proBNP', priority: 'urgent', rationale: '心衰诊断与程度评估' },
      { name: '电解质+肾功能', priority: 'routine', rationale: '评估利尿剂耐受性' },
      { name: '高敏肌钙蛋白', priority: 'routine', rationale: '排查急性冠脉诱因' },
    ],
    imaging: [
      { modality: '胸片', bodyPart: '心肺', urgency: 'urgent', rationale: '肺淤血/心影增大' },
      { modality: '心脏超声', bodyPart: '心脏', urgency: 'urgent', rationale: '评估EF与结构异常' },
    ],
    discriminator: '与肺部感染鉴别：心衰有夜间阵发性呼吸困难、BNP升高、端坐呼吸',
  },
  {
    diagnosis: '心律失常', icd10: 'I49.900', specialty: '心血管', base: 0.1,
    symptoms: [
      { kw: '心悸', weight: 0.5, label: '心悸/心慌' },
      { kw: '黑蒙', weight: 0.3, label: '黑蒙' },
      { kw: '晕厥', weight: 0.3, label: '晕厥' },
      { kw: '脉搏不齐', weight: 0.25, label: '脉搏不齐' },
    ],
    vitals: [{ field: 'heartRate', op: '>=', threshold: 120, weight: 0.15, label: '心率显著增快(或过慢)' }],
    history: [],
    labs: [
      { name: '电解质(钾/镁)', priority: 'urgent', rationale: '排查电解质紊乱诱因' },
      { name: '甲状腺功能', priority: 'routine', rationale: '排查甲亢/甲减所致心律失常' },
      { name: '心肌酶谱', priority: 'routine', rationale: '排查心肌炎/缺血' },
    ],
    imaging: [
      { modality: '12导联心电图', bodyPart: '心脏', urgency: 'stat', rationale: '即时捕捉心律' },
      { modality: '24小时动态心电图(Holter)', bodyPart: '心脏', urgency: 'routine', rationale: '捕捉发作性心律失常' },
    ],
    discriminator: '与单纯焦虑鉴别：心律失常有客观心电/脉搏异常，而非仅主观心悸',
  },
  {
    diagnosis: '高血压急症', icd10: 'I10.x01', specialty: '心血管', base: 0.1,
    symptoms: [
      { kw: '头痛', weight: 0.35, label: '剧烈头痛' },
      { kw: '视物模糊', weight: 0.35, label: '视物模糊/眼底症状' },
      { kw: '胸痛', weight: 0.2, label: '胸痛(靶器官损害)' },
      { kw: '头晕', weight: 0.2, label: '头晕' },
    ],
    vitals: [{ field: 'systolic', op: '>=', threshold: 180, weight: 0.4, label: '收缩压≥180' }],
    history: [{ kw: '高血压', weight: 0.2, label: '既往高血压' }],
    labs: [
      { name: '肾功能+电解质', priority: 'urgent', rationale: '评估肾损害/肾衰' },
      { name: '尿常规+尿微量白蛋白', priority: 'routine', rationale: '评估肾靶器官损害' },
      { name: '心肌酶谱', priority: 'routine', rationale: '排查急性冠脉损害' },
    ],
    imaging: [
      { modality: '头颅CT', bodyPart: '颅脑', urgency: 'stat', rationale: '排查脑出血/脑水肿' },
    ],
    discriminator: '与肾上腺疾病鉴别：高血压急症为血压显著升高伴靶器官损害；继发性高血压需排查肾上腺',
  },
  // ===================== 内分泌 =====================
  {
    diagnosis: '2型糖尿病', icd10: 'E11.900', specialty: '内分泌', base: 0.1,
    symptoms: [
      { kw: '多饮', weight: 0.45, label: '多饮' },
      { kw: '多尿', weight: 0.45, label: '多尿' },
      { kw: '多食', weight: 0.25, label: '多食' },
      { kw: '消瘦', weight: 0.2, label: '近期消瘦' },
    ],
    ageBand: { minAge: 40, maxAge: 150, weight: 0.15, label: '≥40岁代谢综合征带' },
    history: [{ kw: '糖尿病', weight: 0.25, label: '糖尿病家族史/既往' }],
    labs: [
      { name: '空腹血糖+OGTT', priority: 'routine', rationale: '确诊糖代谢异常' },
      { name: '糖化血红蛋白HbA1c', priority: 'routine', rationale: '近3月平均血糖' },
      { name: '尿微量白蛋白/肌酐比', priority: 'routine', rationale: '早期糖尿病肾病筛查' },
    ],
    imaging: [],
    discriminator: '与甲亢鉴别：糖尿病以三多一少+血糖升高为主，无高代谢/突眼表现',
  },
  {
    diagnosis: '甲状腺功能亢进', icd10: 'E05.900', specialty: '内分泌', base: 0.1,
    symptoms: [
      { kw: '心悸', weight: 0.3, label: '心悸' },
      { kw: '多汗', weight: 0.35, label: '怕热多汗' },
      { kw: '消瘦', weight: 0.3, label: '食欲增加但消瘦' },
      { kw: '手抖', weight: 0.35, label: '手抖' },
      { kw: '突眼', weight: 0.4, label: '突眼' },
    ],
    vitals: [{ field: 'heartRate', op: '>=', threshold: 100, weight: 0.15, label: '静息心动过速' }],
    history: [],
    labs: [
      { name: '甲状腺功能(TSH/FT3/FT4)', priority: 'urgent', rationale: '确诊甲亢' },
      { name: 'TRAb(促甲状腺素受体抗体)', priority: 'routine', rationale: 'Graves病病因诊断' },
    ],
    imaging: [
      { modality: '甲状腺超声', bodyPart: '甲状腺', urgency: 'routine', rationale: '评估甲状腺大小/血流' },
    ],
    discriminator: '与心律失常鉴别：甲亢为高代谢综合征+甲功异常，心律失常为继发表现',
  },
  {
    diagnosis: '甲状腺功能减退', icd10: 'E03.900', specialty: '内分泌', base: 0.1,
    symptoms: [
      { kw: '乏力', weight: 0.4, label: '乏力嗜睡' },
      { kw: '怕冷', weight: 0.45, label: '怕冷' },
      { kw: '水肿', weight: 0.3, label: '黏液性水肿(颜面)' },
      { kw: '便秘', weight: 0.25, label: '便秘' },
    ],
    history: [],
    labs: [
      { name: '甲状腺功能(TSH/FT4)', priority: 'routine', rationale: '确诊甲减' },
      { name: '甲状腺自身抗体(TPOAb/TgAb)', priority: 'routine', rationale: '桥本甲状腺炎病因' },
    ],
    imaging: [
      { modality: '甲状腺超声', bodyPart: '甲状腺', urgency: 'routine', rationale: '评估甲状腺结构' },
    ],
    discriminator: '与单纯贫血/心衰鉴别：甲减有TSH升高、FT4降低的实验室证据',
  },
  {
    diagnosis: '肾上腺疾病(嗜铬细胞瘤/库欣等)', icd10: 'E27.900', specialty: '内分泌', base: 0.1,
    symptoms: [
      { kw: '头痛', weight: 0.3, label: '阵发性头痛' },
      { kw: '心悸', weight: 0.3, label: '心悸' },
      { kw: '多汗', weight: 0.3, label: '多汗' },
      { kw: '向心性肥胖', weight: 0.4, label: '向心性肥胖/紫纹' },
    ],
    vitals: [
      { field: 'systolic', op: '>=', threshold: 180, weight: 0.3, label: '阵发性/持续性高血压' },
      { field: 'heartRate', op: '>=', threshold: 100, weight: 0.1, label: '心动过速' },
    ],
    history: [],
    labs: [
      { name: '电解质(血钾)', priority: 'urgent', rationale: '原醛常伴低钾' },
      { name: '血/尿儿茶酚胺及代谢产物(VMA/MN)', priority: 'routine', rationale: '嗜铬细胞瘤筛查' },
      { name: '血/尿皮质醇节律', priority: 'routine', rationale: '库欣综合征评估' },
    ],
    imaging: [
      { modality: '肾上腺CT', bodyPart: '肾上腺', urgency: 'urgent', rationale: '定位肾上腺占位' },
    ],
    discriminator: '与原发性高血压鉴别：肾上腺疾病为继发性、呈阵发性高血压伴低钾/高代谢特征',
  },
];

/* ---------------- 工具函数 ---------------- */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** 原始得分 → 0~1 置信度，封顶 0.95 */
function toConfidence(score: number): number {
  return round2(Math.min(0.95, 0.2 + score * 0.35));
}

function fnv1a(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return `deepdiag_${(h >>> 0).toString(16).padStart(8, '0')}`;
}

const DISCLAIMER =
  '本建议由 AI 规则引擎基于症状与病史生成，仅供临床参考，不构成诊断结论；辅助诊断，最终由医生确认。';

interface Scored {
  rule: DiseaseRule;
  score: number;
  evidence: string[];
}

/** 计算所有病种得分（deepDiagnose 与 differentialDiagnosis 共用） */
function scoreAll(
  symptoms: DeepSymptom[],
  features: PatientFeatures,
  history: DeepHistory,
): Scored[] {
  const symList = Array.isArray(symptoms) ? symptoms : [];
  const feat = features ?? ({} as PatientFeatures);
  const hist = history ?? {};

  const age = Number.isFinite(feat.age) ? Math.max(0, Math.floor(feat.age ?? 0)) : 0;
  const vitals = feat.vitals ?? {};

  const symText =
    symList.map((s) => `${s?.name ?? ''} ${s?.onset ?? ''}`).join(' ').toLowerCase();
  const histText = [
    ...(hist.chronicDiseases ?? []),
    hist.notes ?? '',
    hist.smoking ? '吸烟' : '',
  ].join(' ').toLowerCase();

  const scored: Scored[] = [];
  for (const rule of DISEASE_LIBRARY) {
    let score = rule.base;
    const evidence: string[] = [];

    for (const s of rule.symptoms) {
      if (symText.includes(s.kw)) {
        score += s.weight;
        evidence.push(`症状：${s.label}`);
      }
    }
    if (rule.vitals) {
      for (const v of rule.vitals) {
        const val = vitals[v.field];
        if (typeof val === 'number' && Number.isFinite(val)) {
          const hit = v.op === '>=' ? val >= v.threshold : val <= v.threshold;
          if (hit) {
            score += v.weight;
            evidence.push(`体征：${v.label}（${val}）`);
          }
        }
      }
    }
    if (rule.ageBand && age >= rule.ageBand.minAge && age <= rule.ageBand.maxAge) {
      score += rule.ageBand.weight;
      evidence.push(`人群修正：${rule.ageBand.label}（${age}岁）`);
    }
    for (const h of rule.history) {
      if (histText.includes(h.kw)) {
        score += h.weight;
        evidence.push(`病史：${h.label}`);
      }
    }
    if (evidence.length > 0) scored.push({ rule, score, evidence });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored;
}

/** 红旗症状扫描（独立于具体规则） */
function scanRisks(symText: string): DeepRisk[] {
  const risks: DeepRisk[] = [];
  if (/胸痛/.test(symText) && /大汗|濒死|压榨|放射|持续/.test(symText)) {
    risks.push({ level: 'critical', title: '高危胸痛', detail: '伴大汗/濒死感/放射痛，警惕急性冠脉事件，立即急诊评估。' });
  }
  if (/呼吸困难|喘憋|发绀/.test(symText) && /突发/.test(symText)) {
    risks.push({ level: 'critical', title: '突发呼吸窘迫', detail: '突发呼吸困难警惕肺栓塞/气胸，立即评估氧合。' });
  }
  if (/呕血|黑便|血便/.test(symText)) {
    risks.push({ level: 'critical', title: '消化道出血征象', detail: '呕血/黑便提示消化道出血，警惕失血性休克。' });
  }
  if (/剧烈头痛|视物模糊/.test(symText)) {
    risks.push({ level: 'high', title: '高血压脑病嫌疑', detail: '剧烈头痛伴视物模糊，立即测血压并排查颅内病变。' });
  }
  if (risks.length === 0) {
    risks.push({ level: 'info', title: '未识别到红旗症状', detail: '仍须以执业医师面诊查体为准。' });
  }
  return risks;
}

/**
 * 深度诊断（纯函数）：输出 Top5 可能诊断 + 鉴别诊断 + 建议检验/影像。
 *
 * @param features 患者特征（年龄/性别/生命体征）
 * @param symptoms 主诉症状列表
 * @param history  既往病史
 */
export function deepDiagnose(
  features: PatientFeatures,
  symptoms: DeepSymptom[],
  history: DeepHistory = {},
): DeepDiagnosis {
  const scored = scoreAll(symptoms, features, history);

  let topCandidates: DeepCandidate[];
  if (scored.length === 0) {
    topCandidates = [{
      rank: 1,
      diagnosis: '待查（信息不足）',
      icd10: 'R69.x00',
      specialty: '内分泌',
      confidence: 0.2,
      evidence: ['未命中任何病种规则，建议补充主诉症状、生命体征与既往病史'],
    }];
  } else {
    topCandidates = scored.slice(0, 5).map((s, i) => ({
      rank: i + 1,
      diagnosis: s.rule.diagnosis,
      icd10: s.rule.icd10,
      specialty: s.rule.specialty,
      confidence: toConfidence(s.score),
      evidence: s.evidence,
    }));
  }

  // 鉴别诊断：Top1 之外最相近的候选（含其鉴别要点）
  const differential: Differential[] = scored.slice(1, 5).map((s, i) => ({
    rank: i + 1,
    diagnosis: s.rule.diagnosis,
    icd10: s.rule.icd10,
    specialty: s.rule.specialty,
    discriminator: s.rule.discriminator,
    likelihood: toConfidence(s.score),
  }));

  // 建议检验/影像：以 Top1 为主，合并 Top2~5 去重
  const labTests: LabTest[] = [];
  const imaging: Imaging[] = [];
  for (const s of scored.slice(0, 5)) {
    for (const l of s.rule.labs) {
      if (!labTests.some((x) => x.name === l.name)) labTests.push(l);
    }
    for (const im of s.rule.imaging) {
      if (!imaging.some((x) => x.modality === im.modality && x.bodyPart === im.bodyPart)) {
        imaging.push(im);
      }
    }
  }

  const symText = (symptoms ?? []).map((s) => `${s?.name ?? ''} ${s?.onset ?? ''}`).join(' ').toLowerCase();
  const riskWarnings = scanRisks(symText);

  const deepId = fnv1a(
    `${JSON.stringify(features ?? {})}|${symText}|${JSON.stringify(history ?? {})}`,
  );

  return {
    deepId,
    topCandidates,
    differential,
    labTests,
    imaging,
    riskWarnings,
    generatedAt: new Date().toISOString(),
    disclaimer: DISCLAIMER,
  };
}

/**
 * 鉴别诊断（纯函数）：结合病程与严重度对候选做可能性排序。
 *
 * @param symptoms     症状列表
 * @param durationHours 病程（小时）：急性(<24h)病种加权 / 慢性(>168h≈1周)病种加权
 * @param severity     严重度 0~3（3 最重），对危急重症病种额外加权
 */
export function differentialDiagnosis(
  symptoms: DeepSymptom[],
  durationHours = 0,
  severity = 1,
): Differential[] {
  const scored = scoreAll(symptoms, {}, {});
  const acute = durationHours > 0 && durationHours < 24;
  const chronic = durationHours >= 168; // ≥7 天视为慢性
  const sev = Math.min(3, Math.max(0, severity));

  // 急性/慢性倾向病种名（用于病程修正）
  const acuteFavored = new Set([
    '急性肺栓塞', '急性心力衰竭', '急性胆囊炎', '急性胰腺炎',
    '急性上消化道出血', '冠心病(急性冠脉综合征)', '高血压急症',
    '支气管哮喘急性发作', '慢性阻塞性肺疾病急性加重',
  ]);
  const chronicFavored = new Set([
    '慢性胃炎', '2型糖尿病', '甲状腺功能减退', '甲状腺功能亢进',
    '慢性阻塞性肺疾病急性加重',
  ]);

  return scored.slice(0, 5).map((s, i) => {
    let likelihood = toConfidence(s.score);
    if (acute && acuteFavored.has(s.rule.diagnosis)) likelihood = round2(Math.min(0.95, likelihood + 0.1));
    if (chronic && chronicFavored.has(s.rule.diagnosis)) likelihood = round2(Math.min(0.95, likelihood + 0.1));
    if (sev >= 3 && (s.rule.specialty === '心血管' || s.rule.specialty === '呼吸')) {
      likelihood = round2(Math.min(0.95, likelihood + 0.05));
    }
    return {
      rank: i + 1,
      diagnosis: s.rule.diagnosis,
      icd10: s.rule.icd10,
      specialty: s.rule.specialty,
      discriminator: s.rule.discriminator,
      likelihood,
    };
  });
}

/**
 * 按诊断名（或 ICD10）反查建议检验（纯函数）。
 *
 * @param diagnosis 诊断名或 ICD10，如「急性胰腺炎」「K85.900」
 */
export function suggestLabTests(diagnosis: string): LabTest[] {
  const key = (diagnosis ?? '').trim().toLowerCase();
  if (!key) return [];
  const rule = DISEASE_LIBRARY.find(
    (r) => r.diagnosis === key || r.icd10.toLowerCase() === key,
  );
  return rule ? rule.labs.map((l) => ({ ...l })) : [];
}

/**
 * 按诊断名（或 ICD10）反查建议影像（纯函数）。
 *
 * @param diagnosis 诊断名或 ICD10
 */
export function suggestImaging(diagnosis: string): Imaging[] {
  const key = (diagnosis ?? '').trim().toLowerCase();
  if (!key) return [];
  const rule = DISEASE_LIBRARY.find(
    (r) => r.diagnosis === key || r.icd10.toLowerCase() === key,
  );
  return rule ? rule.imaging.map((im) => ({ ...im })) : [];
}

/** 病种库规模（运营/统计用） */
export const DISEASE_LIBRARY_SIZE = DISEASE_LIBRARY.length;
