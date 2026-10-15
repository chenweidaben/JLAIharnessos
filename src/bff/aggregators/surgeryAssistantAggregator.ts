/**
 * 健澜科技 jlmedaios - 手术麻醉智能助手聚合器（M121-B）
 *   （依据宪法第七章：医疗机构及其医务人员应当关心、爱护、尊重患者，保护患者隐私；
 *     第五十三条：国家发展医疗卫生事业，保护人民健康）
 *
 * 纯函数核心（可单测、不触库、不依赖时钟）：
 *  - buildSurgeryAssistant(doctorId, surgeryId, patientId, data)
 *      输入术前访视上下文（患者基础信息 / 合并症 / 用药 / 过敏 / 气道评估 / 检验 / 手术信息），
 *      输出 { riskAssessment, anesthesiaSuggestions, intraOpAlerts, postOpAdvice }：
 *        riskAssessment       —— 麻醉风险分级（ASA + 命中风险项 + 摘要）；
 *        anesthesiaSuggestions—— 麻醉方式 / 诱导 / 气道 / 镇痛 / 监测 / 预防性抗生素建议；
 *        intraOpAlerts        —— 术中需重点预警的事件（大出血 / 低体温 / 心律失常 / 过敏 …）；
 *        postOpAdvice         —— PACU / 病房 / 出院三阶段术后医嘱建议。
 *
 * 隐私：仅使用院内脱敏 patientId / 临床标签，不输出姓名 / 身份证号 / 床号明文。
 * 边界：本模块输出为「智能提示」，不替代麻醉医师临床判断与书面医嘱。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型契约 ------------------------------- */

/** 性别 */
export type Gender = 'M' | 'F' | 'U';

/** 出血风险（手术本身） */
export type BleedingRisk = 'low' | 'medium' | 'high';

/** ASA 体格状况分级（I~IV，V 为濒死，本助手默认不出现） */
export type AsaLevel = 'I' | 'II' | 'III' | 'IV';

/** 麻醉风险等级 */
export type AnesthesiaRiskLevel = 'low' | 'medium' | 'high';

/** 单次术前检验 */
export interface PreopLab {
  /** 项目编码（Hb / PLT / K / Na / Cr / ALT / Glu / Alb …） */
  code: string;
  /** 项目中文名 */
  name: string;
  /** 结果值 */
  value: number;
  /** 单位 */
  unit: string;
  /** 旗标：N 正常 / H 偏高 / L 偏低 / HH 危急高 / LL 危急低 */
  flag?: 'N' | 'H' | 'L' | 'HH' | 'LL';
}

/** 气道评估 */
export interface AirwayAssessment {
  /** Mallampati 分级 1~4（3 以上提示困难气道） */
  mallampati?: 1 | 2 | 3 | 4;
  /** 张口度（cm），< 3 提示受限 */
  mouthOpeningCm?: number;
  /** 颈椎活动度是否正常 */
  neckMobilityNormal?: boolean;
  /** 是否有上门齿前突 / 小下颌 */
  anatomicalDifficulty?: boolean;
}

/** 手术信息 */
export interface SurgeryInfo {
  /** 手术名称 */
  name: string;
  /** 预计时长（分钟） */
  estimatedDurationMin: number;
  /** 是否急诊手术 */
  isEmergency: boolean;
  /** 手术出血风险 */
  bleedingRisk: BleedingRisk;
  /** 手术体位（仰卧 / 俯卧 / 侧躺 / 截石 …） */
  positioning?: string;
}

/** 聚合器入参：一台拟行手术的术前访视全部上下文 */
export interface SurgeryAssistantData {
  /** 年龄（岁） */
  age: number;
  /** 性别 */
  gender?: Gender;
  /** 体重（kg），用于按体重估算诱导剂量 */
  weightKg: number;
  /** 身高（cm） */
  heightCm?: number;
  /** 合并症列表（如「高血压」「冠心病」「哮喘」「慢性肾功能不全」） */
  comorbidities: string[];
  /** 已知药物 / 食物过敏（如「青霉素」「肌松药」） */
  allergies: string[];
  /** 当前长期用药（含抗凝 / 抗血小板药） */
  medications: string[];
  /** 气道评估 */
  airway?: AirwayAssessment;
  /** 术前检验 */
  labs: PreopLab[];
  /** 手术信息 */
  surgery: SurgeryInfo;
}

/* ----------------------------- 输出类型 ----------------------------- */

export interface RiskItem {
  code: string;
  level: Exclude<AnesthesiaRiskLevel, 'low'>;
  message: string;
}

export interface RiskAssessmentOut {
  /** 综合风险等级 */
  level: AnesthesiaRiskLevel;
  /** ASA 体格分级（基于年龄 / 合并症 / 急诊推导） */
  asaLevel: AsaLevel;
  /** 命中的风险项 */
  items: RiskItem[];
  /** 一句话摘要 */
  summary: string;
}

export interface AnesthesiaSuggestion {
  type: 'induction' | 'maintenance' | 'airway' | 'analgesia' | 'monitoring' | 'antibiotic' | 'positioning';
  priority: 'low' | 'medium' | 'high';
  text: string;
  /** 触发该建议的证据（可追溯到具体检验 / 合并症 / 气道评估） */
  evidence: string;
}

export interface IntraOpAlert {
  /** 预警码：hemorrhage / hypothermia / arrhythmia / allergy / hypotension / hypoglycemia / hypoxia */
  code: string;
  level: Exclude<AnesthesiaRiskLevel, 'low'>;
  /** 触发条件 */
  trigger: string;
  /** 处置建议 */
  advice: string;
}

export interface PostOpAdvice {
  phase: 'pacu' | 'ward' | 'discharge';
  topic: string;
  priority: 'low' | 'medium' | 'high';
  text: string;
}

export interface SurgeryAssistantResult {
  riskAssessment: RiskAssessmentOut;
  anesthesiaSuggestions: AnesthesiaSuggestion[];
  intraOpAlerts: IntraOpAlert[];
  postOpAdvice: PostOpAdvice[];
}

/* ----------------------------- 风险阈值 ----------------------------- */

const LEVEL_RANK: Record<AnesthesiaRiskLevel, number> = { low: 0, medium: 1, high: 2 };

const COMORBID_HIGH = ['冠心病', '近期心梗', '心衰', '严重心律失常', '慢性肾功能不全', '肝功能衰竭', '未控制高血压', '哮喘持续状态'];
const COMORBID_MEDIUM = ['高血压', '2 型糖尿病', '慢性阻塞性肺疾病', '哮喘', '甲状腺疾病', '贫血', '脑梗死后遗症'];

const ANTICOAG_KEYWORDS = ['华法林', '利伐沙班', '阿哌沙班', '达比加群', '阿司匹林', '氯吡格雷', '替格瑞洛', '低分子肝素', '依诺肝素'];

/* ----------------------------- 风险识别 ----------------------------- */

/** 基于合并症 / 年龄 / 急诊推导 ASA 分级（简化版，仅作提示） */
function deriveAsaLevel(age: number, comorbidities: string[], isEmergency: boolean): AsaLevel {
  const highCount = comorbidities.filter((c) => COMORBID_HIGH.some((k) => c.includes(k))).length;
  const mediumCount = comorbidities.filter((c) => COMORBID_MEDIUM.some((k) => c.includes(k))).length;

  let base: AsaLevel = 'I';
  if (highCount >= 1 || (age >= 75 && comorbidities.length >= 2)) base = 'IV';
  else if (mediumCount >= 2 || comorbidities.length >= 3 || age >= 70) base = 'III';
  else if (mediumCount >= 1 || comorbidities.length >= 1) base = 'II';

  // 急诊手术在 ASA 罗马数字后加「E」，本输出仅取基础级，摘要中提示急诊加成
  void isEmergency;
  return base;
}

/** 扫描检验，输出命中的麻醉风险项 */
function detectLabRisks(labs: PreopLab[]): RiskItem[] {
  const items: RiskItem[] = [];
  for (const lab of labs) {
    // 1) 基于代码的硬阈值（即使 flag=N 也兜底识别；这些是临床特异性更强的判断）
    let hardHit: 'anemia' | 'thrombocytopenia' | 'electrolyte' | 'renalImpairment' | 'hyperglycemia' | null = null;
    if (lab.code === 'Hb' && lab.value < 90) {
      hardHit = 'anemia';
      items.push({ code: 'anemia', level: 'high', message: `贫血 Hb=${lab.value}${lab.unit}，需评估是否术前输血/补铁` });
    }
    if (lab.code === 'PLT' && lab.value < 80) {
      hardHit = 'thrombocytopenia';
      items.push({ code: 'thrombocytopenia', level: 'high', message: `血小板 ${lab.value}×10⁹/L，低于麻醉安全阈值` });
    }
    if (lab.code === 'K' && (lab.value < 3.3 || lab.value > 5.5)) {
      hardHit = 'electrolyte';
      items.push({ code: 'electrolyte', level: 'high', message: `血钾 ${lab.value}${lab.unit} 异常，术前需纠正以防心律失常` });
    }
    if (lab.code === 'Cr' && lab.value > 133) {
      items.push({ code: 'renalImpairment', level: 'medium', message: `血肌酐 ${lab.value}${lab.unit}，存在肾功能不全倾向，肌松药/抗生素需调整` });
    }
    if (lab.code === 'Glu' && lab.value > 11.1) {
      items.push({ code: 'hyperglycemia', level: 'medium', message: `血糖 ${lab.value} mmol/L 偏高，围术期需内分泌协同` });
    }

    // 2) flag 告警：危急值 HH/LL 始终保留（与硬阈值是不同维度）；
    //    一般异常 H/L 若已被硬阈值覆盖，则不再重复抛出
    if (lab.flag === 'HH' || lab.flag === 'LL') {
      items.push({
        code: 'criticalLab',
        level: 'high',
        message: `危急值 ${lab.name}(${lab.code})=${lab.value}${lab.unit}，旗标 ${lab.flag}，术前必须复查/纠正`,
      });
      continue;
    }
    if (lab.flag === 'H' || lab.flag === 'L') {
      if (hardHit === null) {
        items.push({
          code: 'abnormalLab',
          level: 'medium',
          message: `异常 ${lab.name}(${lab.code})=${lab.value}${lab.unit}，旗标 ${lab.flag}，建议术前评估意义`,
        });
      }
    }
  }
  return items;
}

/** 扫描合并症 / 用药 / 气道 / 手术信息，输出风险项 */
function detectContextRisks(data: SurgeryAssistantData): RiskItem[] {
  const items: RiskItem[] = [];

  for (const c of data.comorbidities) {
    if (COMORBID_HIGH.some((k) => c.includes(k))) {
      items.push({ code: 'severeComorbidity', level: 'high', message: `合并症「${c}」显著增加麻醉心血管事件风险` });
    }
  }

  const anticoagUsed = data.medications.filter((m) => ANTICOAG_KEYWORDS.some((k) => m.includes(k)));
  if (anticoagUsed.length > 0 && data.surgery.bleedingRisk !== 'low') {
    items.push({
      code: 'anticoagNotHeld',
      level: 'high',
      message: `仍在使用抗凝/抗血小板药（${anticoagUsed.join('、')}），需确认停药时机与桥接方案`,
    });
  }

  if (data.airway) {
    const a = data.airway;
    if (a.mallampati !== undefined && a.mallampati >= 3) {
      items.push({ code: 'difficultAirway', level: 'high', message: `Mallampati ${a.mallampati} 级，提示困难气道，需准备可视喉镜/纤支镜` });
    }
    if (a.mouthOpeningCm !== undefined && a.mouthOpeningCm < 3) {
      items.push({ code: 'limitedMouthOpening', level: 'medium', message: `张口度 ${a.mouthOpeningCm} cm 受限，需评估插管路径` });
    }
    if (a.neckMobilityNormal === false) {
      items.push({ code: 'limitedNeckMovement', level: 'medium', message: '颈椎活动度异常，插管时注意头颈位置' });
    }
    if (a.anatomicalDifficulty) {
      items.push({ code: 'anatomicalAirway', level: 'medium', message: '存在上门齿前突/小下颌等解剖困难因素' });
    }
  }

  if (data.surgery.isEmergency) {
    items.push({ code: 'emergencySurgery', level: 'medium', message: '急诊手术，禁食状态无法确认，误吸风险升高' });
  }
  if (data.surgery.bleedingRisk === 'high') {
    items.push({ code: 'highBleedingRisk', level: 'high', message: `「${data.surgery.name}」属高出血风险手术，需备血并建立大口径静脉通路` });
  }

  if (data.allergies.length > 0) {
    items.push({ code: 'allergyHistory', level: 'medium', message: `既往过敏：${data.allergies.join('、')}，麻醉诱导前再次核对并准备急救药品` });
  }

  return items;
}

/* ----------------------------- 麻醉建议 ----------------------------- */

function buildAnesthesiaSuggestions(data: SurgeryAssistantData, risks: RiskItem[]): AnesthesiaSuggestion[] {
  const out: AnesthesiaSuggestion[] = [];
  const has = (code: string) => risks.some((r) => r.code === code);

  // 气道
  if (has('difficultAirway') || has('limitedMouthOpening') || has('limitedNeckMovement') || has('anatomicalAirway')) {
    out.push({
      type: 'airway',
      priority: 'high',
      text: '按困难气道流程准备：可视喉镜 + 纤维支气管镜 + 喉罩备用，必要时行清醒插管',
      evidence: 'Mallampati/张口度/颈椎活动度异常',
    });
  } else {
    out.push({
      type: 'airway',
      priority: 'low',
      text: '常规气管插管，诱导前预充氧 3 min，备好口咽/鼻咽通气道',
      evidence: '气道评估未见明显困难因素',
    });
  }

  // 诱导（按体重估算，仅作提示）
  const inductionDosage = (1.5 * data.weightKg).toFixed(0);
  out.push({
    type: 'induction',
    priority: 'medium',
    text: `诱导剂量参考：丙泊酚约 ${inductionDosage} mg（按 ${data.weightKg} kg 估算，需根据生命体征滴定）`,
    evidence: `体重 ${data.weightKg} kg`,
  });

  // 维持
  if (data.surgery.estimatedDurationMin >= 120) {
    out.push({
      type: 'maintenance',
      priority: 'medium',
      text: '预计手术时长 ≥2h，建议静吸复合维持，术中监测麻醉深度（BIS）',
      evidence: `预计 ${data.surgery.estimatedDurationMin} min`,
    });
  } else {
    out.push({
      type: 'maintenance',
      priority: 'low',
      text: '预计手术时长较短，可采用全凭静脉或短时效吸入麻醉维持',
      evidence: `预计 ${data.surgery.estimatedDurationMin} min`,
    });
  }

  // 镇痛
  out.push({
    type: 'analgesia',
    priority: 'medium',
    text: '多模式镇痛：诱导前给予阿片类负荷，术中按需追加，术后接 PCA 或神经阻滞',
    evidence: '常规围术期镇痛路径',
  });

  // 监测
  if (has('severeComorbidity') || has('highBleedingRisk') || has('criticalLab')) {
    out.push({
      type: 'monitoring',
      priority: 'high',
      text: '建议行有创动脉血压监测 + 中心静脉置管，术中查血气/血红蛋白',
      evidence: '高风险合并症/高出血风险/危急值',
    });
  } else {
    out.push({
      type: 'monitoring',
      priority: 'low',
      text: '常规五联监测（ECG/NIBP/SpO₂/ETCO₂/体温）',
      evidence: '风险等级较低',
    });
  }

  // 预防性抗生素
  out.push({
    type: 'antibiotic',
    priority: 'medium',
    text: '切皮前 30~60 min 预防性给予第一代头孢（过敏者改用克林霉素）',
    evidence: '外科手术围术期抗菌药物使用规范',
  });

  // 体位
  if (data.surgery.positioning && data.surgery.positioning !== '仰卧') {
    out.push({
      type: 'positioning',
      priority: 'low',
      text: `手术体位为「${data.surgery.positioning}」，注意眼、神经、受压部位保护与气管导管固定`,
      evidence: `体位：${data.surgery.positioning}`,
    });
  }

  const PRIORITY_RANK: Record<AnesthesiaSuggestion['priority'], number> = { high: 0, medium: 1, low: 2 };
  const TYPE_RANK: Record<AnesthesiaSuggestion['type'], number> = {
    airway: 0,
    induction: 1,
    maintenance: 2,
    analgesia: 3,
    monitoring: 4,
    antibiotic: 5,
    positioning: 6,
  };
  return out.sort((a, b) => PRIORITY_RANK[a.priority] - PRIORITY_RANK[b.priority] || TYPE_RANK[a.type] - TYPE_RANK[b.type]);
}

/* ----------------------------- 术中预警 ----------------------------- */

function buildIntraOpAlerts(data: SurgeryAssistantData, risks: RiskItem[]): IntraOpAlert[] {
  const out: IntraOpAlert[] = [];
  const has = (code: string) => risks.some((r) => r.code === code);

  if (data.surgery.bleedingRisk === 'high' || has('thrombocytopenia') || has('anticoagNotHeld')) {
    out.push({
      code: 'hemorrhage',
      level: 'high',
      trigger: '术中出血量 > 预计血容量 20% 或 Hb 进行性下降',
      advice: '启动大量输血方案，维持 MAP ≥65 mmHg，复查血气/凝血，必要时术者暂停操作',
    });
  }

  if (data.surgery.estimatedDurationMin >= 90) {
    out.push({
      code: 'hypothermia',
      level: 'medium',
      trigger: '核心体温 < 36℃',
      advice: '启动充气加温毯 + 输液加温，每 15 min 复测体温',
    });
  }

  if (has('severeComorbidity') || has('electrolyte')) {
    out.push({
      code: 'arrhythmia',
      level: 'high',
      trigger: '突发恶性心律失常（室速/室颤/严重心动过缓）',
      advice: '立即呼叫帮助，按 ACLS 流程处理，查血气/电解质，纠正可逆因素',
    });
  }

  if (data.allergies.length > 0) {
    out.push({
      code: 'allergy',
      level: 'high',
      trigger: '诱导/术中出现皮疹、支气管痉挛、循环虚脱',
      advice: '立即停用可疑药物，肾上腺素 0.3~0.5 mg 肌注，扩容并请变态反应科协同',
    });
  }

  out.push({
    code: 'hypotension',
    level: 'medium',
    trigger: 'MAP < 65 mmHg 持续 > 5 min',
    advice: '减浅麻醉，检查循环/容量，必要时去甲肾上腺素/麻黄碱滴定',
  });

  if (has('hyperglycemia') || data.comorbidities.some((c) => c.includes('糖尿病'))) {
    out.push({
      code: 'hypoglycemia',
      level: 'medium',
      trigger: '术中血糖 < 3.9 mmol/L 或 > 13.9 mmol/L',
      advice: '胰岛素/葡萄糖泵滴定，每 1~2h 复查血糖',
    });
  }

  return out;
}

/* ----------------------------- 术后医嘱 ----------------------------- */

function buildPostOpAdvice(data: SurgeryAssistantData, risks: RiskItem[]): PostOpAdvice[] {
  const out: PostOpAdvice[] = [];
  const has = (code: string) => risks.some((r) => r.code === code);

  // PACU
  out.push({
    phase: 'pacu',
    topic: 'Aldrete 评分',
    priority: 'high',
    text: 'Aldrete 评分 ≥9 分方可转出 PACU；未达标者继续吸氧、监护并每 15 min 复评',
  });
  if (has('difficultAirway')) {
    out.push({
      phase: 'pacu',
      topic: '气道',
      priority: 'high',
      text: '困难气道患者拔管后至少观察 30 min，备再次插管设备于床旁',
    });
  }

  // 病房
  out.push({
    phase: 'ward',
    topic: 'VTE 预防',
    priority: 'medium',
    text: '术后 6h 评估 Caprini 评分，高危者启动药物 + 机械 VTE 预防',
  });
  out.push({
    phase: 'ward',
    topic: '镇痛',
    priority: 'medium',
    text: 'VAS 评分每 4h 评估，多模式镇痛（NSAIDs + 阿片类 + 神经阻滞）',
  });
  out.push({
    phase: 'ward',
    topic: 'PONV',
    priority: 'low',
    text: '高危患者（女性/不吸烟/晕动史/阿片类）诱导前预防性给予 5-HT3 拮抗剂',
  });

  // 出院
  out.push({
    phase: 'discharge',
    topic: '随访',
    priority: 'low',
    text: '出院前告知伤口护理、活动量、拆线时间与复诊节点；出现发热/剧痛/出血立即返院',
  });

  return out;
}

/* ------------------------------- 主入口 ------------------------------- */

/**
 * 手术麻醉智能助手纯函数聚合。
 *
 * @param doctorId  麻醉医师 ID（审计留痕用，函数内不产生副作用）
 * @param surgeryId 拟行手术 ID（审计留痕用）
 * @param patientId 院内脱敏 patientId（审计留痕用）
 * @param data      术前访视上下文（患者基础 / 合并症 / 用药 / 过敏 / 气道 / 检验 / 手术）
 * @returns         { riskAssessment, anesthesiaSuggestions, intraOpAlerts, postOpAdvice }
 */
export function buildSurgeryAssistant(
  doctorId: string,
  surgeryId: string,
  patientId: string,
  data: SurgeryAssistantData,
): SurgeryAssistantResult {
  // 审计上下文仅用于日志追踪，不进入业务返回体，避免泄漏医生/手术/患者标识
  void doctorId;
  void surgeryId;
  void patientId;

  const labRisks = detectLabRisks(data.labs ?? []);
  const contextRisks = detectContextRisks(data);
  const items: RiskItem[] = [...labRisks, ...contextRisks];

  const level: AnesthesiaRiskLevel = items.reduce<AnesthesiaRiskLevel>(
    (acc, it) => (LEVEL_RANK[it.level] > LEVEL_RANK[acc] ? it.level : acc),
    'low',
  );

  const asaLevel = deriveAsaLevel(
    data.age ?? 0,
    data.comorbidities ?? [],
    data.surgery?.isEmergency ?? false,
  );

  const emergencyNote = data.surgery?.isEmergency ? '（急诊，ASA 相当于加 E）' : '';
  const riskAssessment: RiskAssessmentOut = {
    level,
    asaLevel,
    items,
    summary:
      level === 'high'
        ? `ASA ${asaLevel}${emergencyNote}：共 ${items.length} 项高优先级风险，建议多学科会诊后再排程。`
        : level === 'medium'
          ? `ASA ${asaLevel}${emergencyNote}：共 ${items.length} 项需关注事项，术前 1 日再次核对。`
          : `ASA ${asaLevel}${emergencyNote}：术前评估未见明显麻醉禁忌，按常规流程准备。`,
  };

  return {
    riskAssessment,
    anesthesiaSuggestions: buildAnesthesiaSuggestions(data, items),
    intraOpAlerts: buildIntraOpAlerts(data, items),
    postOpAdvice: buildPostOpAdvice(data, items),
  };
}
