/**
 * 健澜科技 jlmedaios - 检验报告患者通俗解读聚合器（M122-B）
 *
 * 依据宪法：宪法第二十一条规定国家发展医疗卫生事业、保护人民健康；
 * 检验结果的通俗化解读帮助患者知情理解、配合治疗与自我健康管理。
 *
 * 核心是纯函数 explainLabResultsForPatient：不访问数据库、不调用大模型，
 * 仅依据检验数值与参考区间做确定性的通俗化转换、风险分级与就医建议生成。
 * 铁律（医疗安全）：AI 仅辅助解读，不做诊断、不出具结论；所有输出均须以
 * “本解读仅供参考，具体诊疗请遵医嘱”为边界提示，危急值一律建议尽快就医。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool.js';

/* ------------------------------- 输入类型 ------------------------------- */

/** 一条检验结果（与 DB 行解耦，便于纯函数单测）。 */
export interface LabResultItem {
  /** 项目名称，如“血红蛋白”。 */
  itemName: string;
  /** 项目编码，如 HGB、WBC（可选，用于匹配科普知识库）。 */
  itemCode?: string | null;
  /** 报告原始显示值，如“125 g/L”。 */
  value?: string | null;
  /** 数值型结果（可比较高低）。 */
  numericValue?: number | null;
  /** 单位。 */
  unit?: string | null;
  /** 参考区间下限。 */
  refLow?: number | null;
  /** 参考区间上限。 */
  refHigh?: number | null;
  /** 异常标志：H 偏高 / L 偏低 / HH 危急偏高 / LL 危急偏低 / N 正常。 */
  abnormalFlag?: string | null;
  /** 是否危急值。 */
  isCritical?: boolean;
  /** 所属检验套餐，如“血常规”。 */
  panelName?: string | null;
  /** 结果时间（ISO 字符串）。 */
  resultTime?: string | null;
}

/** 患者画像（可选字段，用于给出更贴心的建议）。 */
export interface PatientProfile {
  age?: number | null;
  /** 'M' | 'F'，或中文“男/女”。 */
  gender?: string | null;
  /** 已有慢性病，如“糖尿病”“高血压”。 */
  chronicConditions?: string[];
}

/* ------------------------------- 输出类型 ------------------------------- */

/** 单项通俗解读的风险等级。 */
export type PlainRiskLevel = 'normal' | 'high' | 'low' | 'critical' | 'unknown';

export interface PlainExplanation {
  itemName: string;
  /** 数值 + 单位的友好展示，如“125 g/L”。 */
  displayValue: string;
  /** 参考区间友好展示，如“参考 115～150 g/L”。 */
  refRange: string;
  level: PlainRiskLevel;
  /** 通俗结论方向：正常/略偏高/略偏低/明显异常。 */
  directionText: string;
  /** 一句大白话解释这个项目是查什么的、结果意味着什么。 */
  plainText: string;
}

export interface FollowUpNeeded {
  /** 是否需要就医/随访。 */
  needed: boolean;
  /** none 无需；routine 常规复诊咨询；urgent 尽快就医/急诊。 */
  level: 'none' | 'routine' | 'urgent';
  /** 触发分级的原因说明。 */
  reason: string;
  /** 给患者的具体行动建议。 */
  suggestion: string;
}

export interface LabExplainResult {
  plainExplanations: PlainExplanation[];
  possibleCauses: string[];
  careAdvice: string[];
  followUpNeeded: FollowUpNeeded;
}

/* ------------------------------- 科普词典 ------------------------------- */

interface ItemKnowledge {
  /** 这个项目通俗上是查什么的。 */
  what: string;
  /** 偏高时的可能原因（大白话）。 */
  highCauses: string[];
  /** 偏低时的可能原因（大白话）。 */
  lowCauses: string[];
  /** 偏高时的照护建议。 */
  highAdvice: string[];
  /** 偏低时的照护建议。 */
  lowAdvice: string[];
}

/**
 * 常见检验项目科普知识库。键取项目编码（大写）或名称去空格匹配。
 * 未命中项目走通用模板，保证任何项目都能给出人话解释。
 */
const ITEM_KNOWLEDGE: Record<string, ItemKnowledge> = {
  WBC: {
    what: '白细胞是身体里的“免疫卫兵”，负责抵抗细菌等感染。',
    highCauses: ['多半提示身体有炎症或感染，比如感冒发炎'],
    lowCauses: ['可能是抵抗力偏低、或近期病毒感染后暂时下降'],
    highAdvice: ['注意休息、多喝温水，有发热咳嗽请及时就诊'],
    lowAdvice: ['注意保暖防感染，避免去人多拥挤的地方'],
  },
  HGB: {
    what: '血红蛋白存在于红细胞里，负责把氧气运送到全身。',
    highCauses: ['可能与长期缺氧、脱水或血液浓缩有关'],
    lowCauses: ['最常见是贫血，可能与缺铁、失血或营养不足有关'],
    highAdvice: ['适当多饮水，避免剧烈运动后立即检测'],
    lowAdvice: ['可适当吃瘦肉、动物肝脏、绿叶菜等富含铁的食物'],
  },
  RBC: {
    what: '红细胞负责运送氧气，数量多少会影响人是否容易疲乏。',
    highCauses: ['可能与血液浓缩、长期高原生活或心肺问题有关'],
    lowCauses: ['常与贫血相伴，容易感觉乏力、气短'],
    highAdvice: ['多饮水、清淡饮食，可复测确认'],
    lowAdvice: ['注意休息，适当补充含铁和蛋白质的食物'],
  },
  PLT: {
    what: '血小板负责伤口止血，低了容易淤青、出血。',
    highCauses: ['可能与感染后反应、或脾脏切除等有关'],
    lowCauses: ['可能容易牙龈出血、皮肤瘀斑，需重视'],
    highAdvice: ['适度活动，避免久坐，多饮水'],
    lowAdvice: ['避免磕碰和剧烈运动，注意有无牙龈、鼻出血'],
  },
  GLU: {
    what: '血糖是血液里的葡萄糖，反映身体对糖分的调节能力。',
    highCauses: ['可能与糖尿病、近期吃甜食、或应激有关'],
    lowCauses: ['可能是饥饿、用药不当或低血糖发作'],
    highAdvice: ['控制甜食和精制主食，定时定量进餐，必要时复查空腹血糖'],
    lowAdvice: ['随身备几颗糖果，出现心慌出冷汗时及时补充糖分'],
  },
  ALT: {
    what: '谷丙转氨酶主要存在于肝细胞里，是反映肝细胞是否受损的常用指标。',
    highCauses: ['可能与脂肪肝、饮酒、熬夜或药物引起的肝损伤有关'],
    lowCauses: ['单纯轻度偏低一般临床意义不大，常见于休息不足'],
    highAdvice: ['请勿饮酒、避免熬夜和自行服药，饮食宜清淡'],
    lowAdvice: ['规律作息、均衡饮食即可'],
  },
  CREA: {
    what: '肌酐是肌肉代谢的废物，主要靠肾脏排出，反映肾功能。',
    highCauses: ['可能提示肾功能下降，或与脱水、肌肉量较大有关'],
    lowCauses: ['常见于肌肉量偏少、消瘦或饮食蛋白质不足'],
    highAdvice: ['适量饮水，避免自行使用止痛药，尽快让医生评估肾功能'],
    lowAdvice: ['适当补充优质蛋白，如蛋奶、瘦肉'],
  },
  K: {
    what: '血钾调节心跳和肌肉活动，太高太低都可能影响心律。',
    highCauses: ['可能与肾功能差、补钾过多或某些药物有关，需尽快处理'],
    lowCauses: ['可能与呕吐腹泻、利尿或饮食缺钾有关'],
    highAdvice: ['暂勿吃香蕉、橙子等高钾食物，尽快就医'],
    lowAdvice: ['可适当吃橙子、土豆、菠菜等含钾食物'],
  },
  NA: {
    what: '血钠调节身体水分平衡，与口渴、血压相关。',
    highCauses: ['可能与饮水过少、出汗多或盐分摄入过多有关'],
    lowCauses: ['可能与大量饮水、利尿或呕吐腹泻失盐有关'],
    highAdvice: ['少量多次饮水，饮食别太咸'],
    lowAdvice: ['适量补充盐分，避免短时间大量饮水'],
  },
  CHO: {
    what: '总胆固醇反映血脂水平，长期偏高会增加血管负担。',
    highCauses: ['多与高油高胆固醇饮食、肥胖或代谢异常有关'],
    lowCauses: ['偏低可见于消瘦、营养不良或肝脏问题'],
    highAdvice: ['少吃肥肉、动物内脏和油炸食品，多运动'],
    lowAdvice: ['均衡饮食，适当补充优质脂肪'],
  },
  TG: {
    what: '甘油三酯是血脂的一种，与饮食油腻和饮酒关系密切。',
    highCauses: ['常与甜食、饮酒、油腻饮食和肥胖有关'],
    lowCauses: ['轻度偏低一般无需特殊处理'],
    highAdvice: ['戒酒、控糖少油，规律运动控制体重'],
    lowAdvice: ['正常均衡饮食即可'],
  },
};

/* ------------------------------- 工具函数 ------------------------------- */

/** 把异常标志 + 数值区间比较，归一为风险等级。 */
function gradeLevel(item: LabResultItem): PlainRiskLevel {
  const flag = (item.abnormalFlag ?? '').toUpperCase();
  if (item.isCritical || flag === 'HH' || flag === 'LL') return 'critical';
  if (flag === 'H' || flag === 'HH') return 'high';
  if (flag === 'L' || flag === 'LL') return 'low';
  if (flag === 'N') return 'normal';

  // 无标志时按数值与参考区间推断。
  const v = item.numericValue;
  if (v == null) return 'unknown';
  if (item.refHigh != null && v > item.refHigh) return 'high';
  if (item.refLow != null && v < item.refLow) return 'low';
  return 'normal';
}

function knowledgeOf(item: LabResultItem): ItemKnowledge | null {
  const code = (item.itemCode ?? '').toUpperCase();
  if (code && ITEM_KNOWLEDGE[code]) return ITEM_KNOWLEDGE[code];
  const name = (item.itemName ?? '').replace(/\s/g, '');
  for (const [key, val] of Object.entries(ITEM_KNOWLEDGE)) {
    if (name.includes(val.what.slice(0, 2))) return val;
  }
  // 用名称反查常见项目名。
  const alias: Record<string, string> = {
    血红蛋白: 'HGB', 白细胞: 'WBC', 红细胞: 'RBC', 血小板: 'PLT',
    血糖: 'GLU', 葡萄糖: 'GLU', 谷丙转氨酶: 'ALT', 肌酐: 'CREA',
    血钾: 'K', 血钠: 'NA', 总胆固醇: 'CHO', 甘油三酯: 'TG',
  };
  for (const [nameAlias, codeKey] of Object.entries(alias)) {
    if (name.includes(nameAlias) && ITEM_KNOWLEDGE[codeKey]) return ITEM_KNOWLEDGE[codeKey];
  }
  return null;
}

function displayValue(item: LabResultItem): string {
  if (item.value) return item.value;
  if (item.numericValue != null) {
    return item.unit ? `${item.numericValue} ${item.unit}` : String(item.numericValue);
  }
  return '—';
}

function refRangeText(item: LabResultItem): string {
  const { refLow, refHigh, unit } = item;
  if (refLow != null && refHigh != null) {
    return `参考 ${refLow}～${refHigh}${unit ? ` ${unit}` : ''}`;
  }
  if (refHigh != null) return `参考 ≤ ${refHigh}${unit ? ` ${unit}` : ''}`;
  if (refLow != null) return `参考 ≥ ${refLow}${unit ? ` ${unit}` : ''}`;
  return '参考区间未提供';
}

const DIRECTION: Record<PlainRiskLevel, string> = {
  normal: '结果在正常范围内',
  high: '结果略偏高',
  low: '结果略偏低',
  critical: '结果明显异常（危急）',
  unknown: '结果无法自动判读',
};

/* ------------------------------- 纯函数主体 ------------------------------- */

/**
 * 把检验结果翻译成患者能看懂的大白话。
 * @param labResults 一次报告（report_no）下的全部检验项目。
 * @param patientProfile 患者画像（可选）。
 * @returns 通俗解读、可能原因、照护建议、是否需要随访。
 */
export function explainLabResultsForPatient(
  labResults: LabResultItem[],
  patientProfile: PatientProfile = {},
): LabExplainResult {
  const items = Array.isArray(labResults) ? labResults : [];
  const possibleCauses: string[] = [];
  const careAdvice: string[] = [];
  const plainExplanations: PlainExplanation[] = [];

  let hasCritical = false;
  let hasAbnormal = false;

  for (const item of items) {
    const level = gradeLevel(item);
    const knowledge = knowledgeOf(item);
    const name = item.itemName || '未知项目';

    let plainText: string;
    if (knowledge) {
      plainText = `${knowledge.what}本次${DIRECTION[level]}。`;
    } else {
      plainText = `这是“${name}”这一项的检查结果，${DIRECTION[level]}，具体临床意义请结合报告单由医生解释。`;
    }

    plainExplanations.push({
      itemName: name,
      displayValue: displayValue(item),
      refRange: refRangeText(item),
      level,
      directionText: DIRECTION[level],
      plainText,
    });

    if (level === 'critical') hasCritical = true;
    if (level === 'high' || level === 'low') hasAbnormal = true;

    // 可能原因与照护建议：仅对异常项目补充。
    if (knowledge && level === 'high') {
      for (const c of knowledge.highCauses) possibleCauses.push(`${name}偏高：${c}`);
      for (const a of knowledge.highAdvice) careAdvice.push(a);
    } else if (knowledge && level === 'low') {
      for (const c of knowledge.lowCauses) possibleCauses.push(`${name}偏低：${c}`);
      for (const a of knowledge.lowAdvice) careAdvice.push(a);
    }
  }

  // 画像个性化建议（去重）。
  if (patientProfile.age != null && patientProfile.age >= 60) {
    careAdvice.push('您属于老年人群，指标波动更需留意，建议居家记录身体感受。');
  }
  if (patientProfile.chronicConditions?.length) {
    careAdvice.push(
      `您有${patientProfile.chronicConditions.join('、')}等基础病，复查指标请主动告知随访医生。`,
    );
  }

  // 通用兜底建议。
  careAdvice.push('规律作息、清淡饮食、适量饮水、避免熬夜与饮酒，保持良好心态。');
  careAdvice.push('本通俗解读仅供参考，不能替代医生诊断，具体诊疗请以面诊医生意见为准。');

  // 风险分级 -> 随访建议。
  let followUpNeeded: FollowUpNeeded;
  if (hasCritical) {
    followUpNeeded = {
      needed: true,
      level: 'urgent',
      reason: '报告中存在危急值（明显异常）。',
      suggestion: '请尽快联系开单医生或就近就医，必要时拨打急救电话，不要自行用药处理。',
    };
  } else if (hasAbnormal) {
    followUpNeeded = {
      needed: true,
      level: 'routine',
      reason: '报告中有部分指标不在正常范围。',
      suggestion: '建议在下次复诊时携带本报告，向医生说明近期身体感受后再做判断。',
    };
  } else {
    followUpNeeded = {
      needed: false,
      level: 'none',
      reason: '报告各项指标均在正常范围内。',
      suggestion: '暂无特殊就医需求，继续保持健康生活方式，按医嘱定期体检即可。',
    };
  }

  return {
    plainExplanations,
    possibleCauses: dedupe(possibleCauses),
    careAdvice: dedupe(careAdvice),
    followUpNeeded,
  };
}

function dedupe(list: string[]): string[] {
  return Array.from(new Set(list));
}

/* --------------------------- 按报告号取数（非纯函数） --------------------------- */

export class PatientLabExplainError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message);
    this.name = 'PatientLabExplainError';
  }
}

/**
 * 按报告号（report_no）拉取一次报告的全部检验项，并做通俗解读。
 * 注：权限边界由路由层（患者门户权限）把控；本函数只负责取数 + 纯解读。
 */
export async function explainLabReportByReportId(
  reportId: string,
  patientProfile: PatientProfile = {},
): Promise<LabExplainResult & { reportId: string; itemCount: number }> {
  if (!reportId || !reportId.trim()) {
    throw new PatientLabExplainError(400, 'BAD_REQUEST', '缺少报告号 reportId');
  }
  const db = getDb();
  const rows = (await db`
    SELECT item_name, item_code, value, numeric_value, unit, ref_low, ref_high,
           abnormal_flag, is_critical, panel_name, result_time
    FROM clinical.lab_results
    WHERE report_no = ${reportId.trim()}
    ORDER BY result_time DESC, created_at DESC
  `) as Record<string, unknown>[];

  if (rows.length === 0) {
    throw new PatientLabExplainError(404, 'NOT_FOUND', '未找到该报告号对应的检验结果');
  }

  const items: LabResultItem[] = rows.map((r) => ({
    itemName: String(r.item_name),
    itemCode: r.item_code ? String(r.item_code) : null,
    value: r.value ? String(r.value) : null,
    numericValue: r.numeric_value != null ? Number(r.numeric_value) : null,
    unit: r.unit ? String(r.unit) : null,
    refLow: r.ref_low != null ? Number(r.ref_low) : null,
    refHigh: r.ref_high != null ? Number(r.ref_high) : null,
    abnormalFlag: r.abnormal_flag ? String(r.abnormal_flag) : null,
    isCritical: Boolean(r.is_critical),
    panelName: r.panel_name ? String(r.panel_name) : null,
    resultTime: r.result_time ? String(r.result_time) : null,
  }));

  const explained = explainLabResultsForPatient(items, patientProfile);
  return { ...explained, reportId: reportId.trim(), itemCount: items.length };
}
