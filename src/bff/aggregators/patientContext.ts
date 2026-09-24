/**
 * 健澜科技 jlmedaios - 患者上下文构建器
 *
 * 在门诊 AI 对话开始前，从真实 PostgreSQL 读取当前就诊快照（门诊聚合器产物），
 * 格式化为紧凑的中文上下文块，注入 LLM 系统提示，使 AI 真正“认识当前患者”，
 * 而不是脱离病历空答。所有数据均来自真实库；读取失败时返回 null，由调用方明确降级，
 * 绝不编造患者信息。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getEncounter } from './outpatientAggregator';

type Dict = Record<string, unknown>;

function asRecord(v: unknown): Dict {
  return v && typeof v === 'object' ? (v as Dict) : {};
}

function asList(v: unknown): unknown[] {
  return Array.isArray(v) ? v : [];
}

function str(v: unknown, fallback = ''): string {
  return typeof v === 'string' && v.trim() ? v : fallback;
}

function truncate(s: string, n: number): string {
  const t = s.trim();
  return t.length > n ? `${t.slice(0, n)}…` : t;
}

/** 将结构化现病史对象拼成可读短句 */
function presentIllnessText(pi: unknown): string {
  const o = asRecord(pi);
  const parts: string[] = [];
  // 每项：[标签, 候选键列表]（首选对齐门诊表单 ConsultationForm 实际落库键，别名用于兼容历史数据）
  const labelMap: Array<[string, string[]]> = [
    ['起病时间', ['onsetTime']],
    ['诱因', ['trigger']],
    ['主要症状', ['mainSymptom', 'symptomDetail']],
    ['伴随症状', ['accompanying', 'accompanySymptom']],
    ['加重因素', ['aggravating']],
    ['缓解因素', ['relieving']],
    ['演变过程', ['evolution']],
    ['诊疗经过', ['treatmentProcess', 'preTreatment']],
    ['一般情况', ['generalCondition']],
  ];
  for (const [label, keys] of labelMap) {
    let v = '';
    for (const key of keys) {
      v = str(o[key]);
      if (v) break;
    }
    if (v) parts.push(`${label}：${v}`);
  }
  return parts.join('；');
}

/** 将结构化既往史对象拼成可读短句（对齐门诊表单 pastHistory 键） */
function pastHistoryText(ph: unknown): string {
  const o = asRecord(ph);
  const parts: string[] = [];
  const labelMap: Array<[string, string[]]> = [
    ['既往疾病', ['diseases', 'disease']],
    ['手术史', ['surgery']],
    ['外伤/输血史', ['traumaTransfusion', 'trauma']],
    ['过敏史', ['allergy']],
  ];
  for (const [label, keys] of labelMap) {
    let v = '';
    for (const key of keys) {
      v = str(o[key]);
      if (v) break;
    }
    if (v) parts.push(`${label}：${v}`);
  }
  return parts.join('；');
}

/**
 * 构建患者上下文块。
 * @param encounterId 当前门诊就诊 ID（首选，信息最全）
 * @returns 上下文文本；无就诊或读取失败返回 null
 */
export async function buildPatientContextBlock(
  encounterId?: string | null,
): Promise<string | null> {
  if (!encounterId) return null;
  let bundle: unknown;
  try {
    bundle = await getEncounter(encounterId);
  } catch {
    return null;
  }
  if (!bundle || typeof bundle !== 'object') return null;
  const b = asRecord(bundle);
  const patient = asRecord(b.patient);
  const consultation = asRecord(b.consultation);

  const lines: string[] = [];

  // 基本信息
  const demographics: string[] = [];
  if (patient.name) demographics.push(String(patient.name));
  if (patient.gender) demographics.push(`${patient.gender}`);
  if (patient.age !== undefined && patient.age !== null) demographics.push(`${patient.age}岁`);
  if (demographics.length > 0) lines.push(`- 患者：${demographics.join('，')}`);

  const allergies = asList(patient.allergies)
    .map((a) => (typeof a === 'string' ? a : asRecord(a).name))
    .filter(Boolean);
  if (allergies.length > 0) lines.push(`- 过敏史：${allergies.join('、')}`);

  const chronic = asList(patient.chronicDiseases ?? patient.pastHistory)
    .map((c) => (typeof c === 'string' ? c : asRecord(c).name))
    .filter(Boolean);
  if (chronic.length > 0) lines.push(`- 慢性病/既往史：${chronic.join('、')}`);

  // 主诉与现病史
  const chief = str(consultation.chiefComplaint);
  if (chief) lines.push(`- 主诉：${truncate(chief, 120)}`);
  const pi = presentIllnessText(consultation.presentIllness);
  if (pi) lines.push(`- 现病史：${truncate(pi, 300)}`);
  const ph = pastHistoryText(consultation.pastHistory);
  if (ph) lines.push(`- 既往史：${truncate(ph, 240)}`);

  // 诊断
  const diagText = asList(b.diagnoses)
    .map((d) => {
      const o = asRecord(d);
      const name = str(o.name);
      const code = str(o.code);
      const confirmed = o.confirmed === true ? '（已确认）' : '（待确认）';
      return name ? `${name}${code ? ` ${code}` : ''}${confirmed}` : '';
    })
    .filter(Boolean);
  if (diagText.length > 0) lines.push(`- 诊断：${diagText.join('；')}`);

  // 医嘱
  const orderText = asList(b.orders)
    .map((o) => {
      const rec = asRecord(o);
      const name = str(rec.name);
      const kind = str(rec.kind);
      const status = str(rec.status);
      return name ? `${name}${kind ? `(${kind}` : ''}${status ? `/${status})` : kind ? ')' : ''}` : '';
    })
    .filter(Boolean);
  if (orderText.length > 0) lines.push(`- 已开医嘱：${truncate(orderText.join('；'), 200)}`);

  // 当前处方/用药
  const medText = asList(b.prescriptions).flatMap((p) => {
    const rx = asRecord(p);
    return asList(rx.lines).map((l) => {
      const line = asRecord(l);
      const drug = asRecord(line.drug);
      const name = str(drug.genericName);
      const dose = str(line.dose);
      const freq = str(line.frequency);
      const days = line.days ? `${line.days}天` : '';
      return [name, dose, freq, days].filter(Boolean).join(' ');
    });
  });
  const currentMeds = asList(patient.currentMedications)
    .map((m) => String(m))
    .filter(Boolean);
  const allMeds = Array.from(new Set([...medText, ...currentMeds]));
  if (allMeds.length > 0) lines.push(`- 当前用药：${truncate(allMeds.join('；'), 240)}`);

  // CDS 提醒
  const cdsText = asList(b.cdsReminders)
    .map((r) => {
      const o = asRecord(r);
      const level = str(o.level);
      const title = str(o.title);
      const detail = str(o.detail);
      const tag = level === 'danger' ? '[严重]' : level === 'warning' ? '[警告]' : '[提示]';
      return title ? `${tag}${title}${detail ? `：${detail}` : ''}` : '';
    })
    .filter(Boolean);
  if (cdsText.length > 0) lines.push(`- 系统安全提醒：${truncate(cdsText.join('；'), 260)}`);

  if (lines.length === 0) return null;
  return ['【当前患者上下文（来自医院真实数据库，仅供辅助参考，最终以医生判断为准）】', ...lines].join('\n');
}
