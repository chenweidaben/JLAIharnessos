/**
 * 健澜科技 jlmedaios - NLP 病历要素抽取纯函数（M461-C，V14，EMR 深化四模块）
 *
 * 基于规则匹配（不调 LLM）：主诉症状 / 现病史时间线 / 诊断 / 用药 / 手术操作 / 否定词检测。
 *
 * 纯函数、无 I/O、可重复。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 病历要素聚合结果 */
export interface MedicalRecordElements {
  chiefComplaint: { text: string; symptoms: string[] };
  presentIllnessTimeline: { onsetTime?: string; durationDays?: number; events: string[] };
  diagnoses: string[];
  medications: string[];
  procedures: string[];
  negations: string[];
}

/** 症状关键词词表 */
const SYMPTOM_KEYWORDS = [
  "发热", "咳嗽", "胸痛", "腹痛", "头痛", "头晕", "恶心", "呕吐", "呼吸困难",
];

/** 药名关键词词表（常见抗生素/降压药） */
const MEDICATION_KEYWORDS = [
  "头孢", "阿莫西林", "阿奇", "左氧", "青霉素", "硝苯地平", "氨氯地平", "美托洛尔",
];

/** 手术操作关键词词表 */
const PROCEDURE_KEYWORDS = [
  "阑尾切除术", "胆囊切除术", "冠脉造影", "支架植入", "胸腔穿刺", "腹腔穿刺",
];

/** 否定词词表 */
const NEGATION_WORDS = ["无", "否认", "未见", "未触及", "未闻", "未及"];

/**
 * 从主诉段抽取症状关键词。
 *
 * @param text 主诉文本
 * @returns 抽取结果（原文 + 命中症状数组）
 */
export function extractChiefComplaint(text: string): { text: string; symptoms: string[] } {
  const symptoms = SYMPTOM_KEYWORDS.filter((s) => text.includes(s));
  return { text, symptoms };
}

/**
 * 用正则提取时间表达式并换算成相对天数。
 *
 * @param text 现病史文本
 * @returns 时间线（onsetTime 原文 / durationDays 天数 / events 事件数组）
 */
export function extractPresentIllnessTimeline(text: string): { onsetTime?: string; durationDays?: number; events: string[] } {
  const events: string[] = [];
  let onsetTime: string | undefined;
  let durationDays: number | undefined;
  const dayMatch = text.match(/(\d+)\s*天前/);
  if (dayMatch) {
    onsetTime = dayMatch[0];
    durationDays = Number(dayMatch[1]);
    events.push(dayMatch[0]);
  }
  const weekMatch = text.match(/(\d+)\s*周前/);
  if (weekMatch) {
    onsetTime = onsetTime ?? weekMatch[0];
    durationDays = durationDays ?? Number(weekMatch[1]) * 7;
    events.push(weekMatch[0]);
  }
  const monthMatch = text.match(/(\d+)\s*月前/);
  if (monthMatch) {
    onsetTime = onsetTime ?? monthMatch[0];
    durationDays = durationDays ?? Number(monthMatch[1]) * 30;
    events.push(monthMatch[0]);
  }
  return { onsetTime, durationDays, events };
}

/**
 * 从"诊断：/初步诊断：/入院诊断："后抽取诊断词（以标点/分号分隔）。
 *
 * @param text 病历文本
 * @returns 诊断词数组
 */
export function extractDiagnoses(text: string): string[] {
  const match = text.match(/(?:初步诊断|入院诊断|诊断)[：:]\s*([^\n]+)/);
  if (!match) return [];
  return match[1]
    .split(/[;；,，]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * 从"用药：/医嘱："后抽取药名（关键词匹配常见抗生素/降压药）。
 *
 * @param text 病历文本
 * @returns 药名数组
 */
export function extractMedications(text: string): string[] {
  const match = text.match(/(?:用药|医嘱)[：:]\s*([^\n]+)/);
  const source = match ? match[1] : text;
  return MEDICATION_KEYWORDS.filter((m) => source.includes(m));
}

/**
 * 从"手术：/操作："后抽取手术操作词。
 *
 * @param text 病历文本
 * @returns 手术操作词数组
 */
export function extractProcedures(text: string): string[] {
  const match = text.match(/(?:手术|操作)[：:]\s*([^\n]+)/);
  const source = match ? match[1] : text;
  return PROCEDURE_KEYWORDS.filter((p) => source.includes(p));
}

/**
 * 否定词检测：否定词后跟随的实体标注为否定。
 *
 * @param text 病历文本
 * @returns 否定实体数组
 */
export function detectNegation(text: string): string[] {
  const negations: string[] = [];
  for (const neg of NEGATION_WORDS) {
    for (const entity of [...SYMPTOM_KEYWORDS, ...MEDICATION_KEYWORDS, ...PROCEDURE_KEYWORDS]) {
      const pattern = `${neg}${entity}`;
      if (text.includes(pattern)) {
        negations.push(entity);
      }
    }
  }
  return negations;
}

/**
 * 聚合以上抽取。
 *
 * @param text 病历全文
 * @returns 聚合结果
 */
export function extractMedicalRecordElements(text: string): MedicalRecordElements {
  return {
    chiefComplaint: extractChiefComplaint(text),
    presentIllnessTimeline: extractPresentIllnessTimeline(text),
    diagnoses: extractDiagnoses(text),
    medications: extractMedications(text),
    procedures: extractProcedures(text),
    negations: detectNegation(text),
  };
}
