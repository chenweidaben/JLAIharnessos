import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/diagnosisSuggestionRepo';

export class DiagnosisError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

// 本地规则匹配（确定性）
function matchDiagnoses(chiefComplaint: string, symptoms: string[]): Array<{diagnosis: string; confidence: number; icd10: string}> {
  const results: Array<{diagnosis: string; confidence: number; icd10: string}> = [];
  const text = (chiefComplaint + ' ' + symptoms.join(' ')).toLowerCase();

  if (text.includes('胸痛') || text.includes('chest pain')) {
    results.push({diagnosis: '冠心病 心绞痛', confidence: 0.75, icd10: 'I20.900'});
    results.push({diagnosis: '急性心肌梗死', confidence: 0.45, icd10: 'I21.900'});
  }
  if (text.includes('腹痛') || text.includes('abdominal pain')) {
    results.push({diagnosis: '急性胃肠炎', confidence: 0.65, icd10: 'K52.900'});
    results.push({diagnosis: '急性阑尾炎', confidence: 0.40, icd10: 'K35.900'});
  }
  if (text.includes('咳嗽') || text.includes('fever') || text.includes('发热')) {
    results.push({diagnosis: '上呼吸道感染', confidence: 0.70, icd10: 'J06.900'});
    results.push({diagnosis: '肺炎', confidence: 0.50, icd10: 'J18.900'});
  }
  if (text.includes('头痛') || text.includes('headache')) {
    results.push({diagnosis: '紧张性头痛', confidence: 0.60, icd10: 'G44.200'});
    results.push({diagnosis: '偏头痛', confidence: 0.45, icd10: 'G43.900'});
  }
  if (results.length === 0) {
    results.push({diagnosis: '待查', confidence: 0.10, icd10: 'R69.x00'});
  }
  return results.sort((a, b) => b.confidence - a.confidence);
}

export async function listView(view: AuthView, visitId: string) {
  if (!view.permissions.includes('ai_diagnosis:view')) throw new DiagnosisError(403, '无权限');
  if (!visitId) throw new DiagnosisError(400, 'visitId 必填');
  return repo.listByVisit(visitId);
}

export async function suggestView(view: AuthView, body: Record<string, unknown>) {
  if (!view.permissions.includes('ai_diagnosis:view')) throw new DiagnosisError(403, '无权限');
  if (!body.visitId) throw new DiagnosisError(400, 'visitId 必填');
  const complaint = String(body.chiefComplaint ?? '');
  const symptoms = body.symptoms ? body.symptoms as string[] : [];
  const suggestions = matchDiagnoses(complaint, symptoms);
  const maxConf = suggestions[0]?.confidence ?? 0;
  return repo.create({
    visitId: String(body.visitId), chiefComplaint: complaint, symptoms,
    suggestions, confidence: maxConf,
  });
}

export async function reviewView(view: AuthView, id: string, accepted: boolean, selectedDiagnosis?: string) {
  const d = await repo.review(id, view.id, accepted, selectedDiagnosis);
  if (!d) throw new DiagnosisError(409, '仅待审核建议可审核');
  return d;
}

/* ============================================================================
 * AI能力升级（M126-B）：智能诊断建议纯函数
 * ----------------------------------------------------------------------------
 * generateDiagnosisSuggestions(patientId, symptoms, labResults, history)
 *   输入主诉症状 / 本次检验 / 既往病史，规则引擎输出：
 *     - Top3 可能诊断（按似然概率降序）
 *     - 每个诊断的支持依据（症状 / 检验 / 病史命中）
 *     - 鉴别检查建议（下一步应补哪些检查）
 *     - 危险警示（红旗症状 / 危急化验 -> 立即人工急诊）
 *
 * 医疗安全红线：
 *   - 本函数为"可能方向"排序，不构成诊断结论；最终诊断须由执业医师结合查体确认；
 *   - 红旗症状（高危胸痛 / 卒中 / 消化道大出血）一律升级为 critical 警示并提示急诊；
 *   - 全程只读、不落库、不调 LLM；患者标识仅以脱敏尾号回传（宪法第七章个人信息保护）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * ========================================================================== */

/** 单条症状 */
export interface DiagnosisSymptomInput {
  /** 症状名，如 胸痛 */
  name: string;
  /** 严重程度 1-10（可选，仅展示） */
  severity?: number;
  /** 起病特点 / 时间描述，如 压榨样、持续20分钟（可选，参与关键词匹配） */
  onset?: string;
}

/** 单条检验结果（用于与诊断规则的异常方向做关联） */
export interface DiagnosisLabInput {
  markerCode: string;
  markerName?: string;
  value: number;
  unit?: string;
  refLow?: number | null;
  refHigh?: number | null;
}

/** 既往病史 */
export interface DiagnosisHistoryInput {
  /** 既往慢病，如 高血压 / 2型糖尿病 */
  chronicDiseases?: string[];
  surgeries?: string[];
  allergies?: string[];
  smoking?: boolean;
  /** 其他补充病史描述 */
  notes?: string;
}

/** 单个可能诊断（Top3 之一） */
export interface DiagnosisCandidate {
  rank: number;
  diagnosis: string;
  icd10: string;
  /** 似然概率 0~1（在返回的候选之间归一化），按降序 */
  probability: number;
  /** 支持依据：命中的症状 / 检验 / 病史条目 */
  supportingEvidence: string[];
  /** 鉴别诊断建议的下一步检查 */
  differentialExams: string[];
}

/** 危险警示 */
export interface DiagnosisWarning {
  level: 'critical' | 'high' | 'info';
  title: string;
  detail: string;
}

/** generateDiagnosisSuggestions 返回体 */
export interface Suggestions {
  /** 脱敏患者标识（仅尾 4 位） */
  patientIdMasked: string;
  /** Top3 可能诊断，按概率降序 */
  candidates: DiagnosisCandidate[];
  /** 危险警示（红旗症状 / 危急化验） */
  warnings: DiagnosisWarning[];
  generatedAt: string;
  /** 医疗免责声明 */
  disclaimer: string;
}

/** 内部诊断规则 */
interface DiagnosisRule {
  diagnosis: string;
  icd10: string;
  /** 先验基础分（须叠加至少一条命中才有资格入选） */
  base: number;
  symptomHits: Array<{ kw: string; weight: number; label: string }>;
  labHits: Array<{ marker: string; direction: 'high' | 'low'; weight: number; label: string }>;
  historyHits: Array<{ kw: string; weight: number }>;
  exams: string[];
}

/** 内置鉴别诊断规则库（规则兜底，非确诊；权重为启发式） */
const DIAGNOSIS_RULES: DiagnosisRule[] = [
  {
    diagnosis: '冠心病（心绞痛）', icd10: 'I20.900', base: 0.1,
    symptomHits: [
      { kw: '胸痛', weight: 0.5, label: '胸痛' },
      { kw: '胸闷', weight: 0.3, label: '胸闷' },
      { kw: '压榨', weight: 0.6, label: '压榨样疼痛' },
      { kw: '放射', weight: 0.5, label: '疼痛放射至肩背/下颌' },
      { kw: '活动后', weight: 0.3, label: '活动后加重' },
    ],
    labHits: [
      { marker: 'CK-MB', direction: 'high', weight: 0.3, label: '肌酸激酶同工酶' },
      { marker: 'cTnI', direction: 'high', weight: 0.4, label: '肌钙蛋白I' },
      { marker: 'CK', direction: 'high', weight: 0.15, label: '肌酸激酶' },
    ],
    historyHits: [
      { kw: '高血压', weight: 0.15 }, { kw: '高血脂', weight: 0.15 },
      { kw: '糖尿病', weight: 0.15 }, { kw: '吸烟', weight: 0.1 },
    ],
    exams: ['12导联心电图', '肌钙蛋白(cTnI/cTnT)定量', '心肌酶谱(CK-MB/CK)', '冠脉CTA/造影'],
  },
  {
    diagnosis: '急性心肌梗死', icd10: 'I21.900', base: 0.1,
    symptomHits: [
      { kw: '胸痛', weight: 0.3, label: '胸痛' },
      { kw: '大汗', weight: 0.5, label: '大汗淋漓' },
      { kw: '濒死', weight: 0.6, label: '濒死感' },
      { kw: '持续', weight: 0.5, label: '持续不缓解胸痛' },
    ],
    labHits: [
      { marker: 'cTnI', direction: 'high', weight: 0.5, label: '肌钙蛋白I' },
      { marker: 'cTnT', direction: 'high', weight: 0.5, label: '肌钙蛋白T' },
      { marker: 'CK-MB', direction: 'high', weight: 0.4, label: '肌酸激酶同工酶' },
    ],
    historyHits: [{ kw: '冠心病', weight: 0.2 }],
    exams: ['急诊12导联心电图', '肌钙蛋白动态定量', '急诊PCI/再灌注评估'],
  },
  {
    diagnosis: '社区获得性肺炎', icd10: 'J18.900', base: 0.1,
    symptomHits: [
      { kw: '发热', weight: 0.3, label: '发热' },
      { kw: '咳嗽', weight: 0.3, label: '咳嗽' },
      { kw: '咳痰', weight: 0.3, label: '咳痰' },
      { kw: '气促', weight: 0.3, label: '气促' },
      { kw: '胸痛', weight: 0.1, label: '胸膜性胸痛' },
    ],
    labHits: [
      { marker: 'WBC', direction: 'high', weight: 0.15, label: '白细胞升高' },
      { marker: 'NEUT', direction: 'high', weight: 0.15, label: '中性粒升高' },
      { marker: 'CRP', direction: 'high', weight: 0.2, label: 'C反应蛋白升高' },
      { marker: 'PCT', direction: 'high', weight: 0.25, label: '降钙素原升高' },
    ],
    historyHits: [],
    exams: ['胸部CT/胸片', '痰培养+药敏', '血常规+CRP+PCT', '动脉血气(重症)'],
  },
  {
    diagnosis: '上呼吸道感染', icd10: 'J06.900', base: 0.1,
    symptomHits: [
      { kw: '发热', weight: 0.2, label: '低热' },
      { kw: '咽痛', weight: 0.4, label: '咽痛' },
      { kw: '咳嗽', weight: 0.2, label: '干咳' },
      { kw: '鼻塞', weight: 0.4, label: '鼻塞' },
      { kw: '流涕', weight: 0.4, label: '流涕' },
    ],
    labHits: [],
    historyHits: [],
    exams: ['血常规+CRP', '流感抗原检测(必要时)'],
  },
  {
    diagnosis: '急性阑尾炎', icd10: 'K35.900', base: 0.1,
    symptomHits: [
      { kw: '腹痛', weight: 0.3, label: '腹痛' },
      { kw: '转移性右下腹痛', weight: 0.6, label: '转移性右下腹痛' },
      { kw: '右下腹', weight: 0.5, label: '右下腹压痛' },
      { kw: '发热', weight: 0.1, label: '低热' },
      { kw: '恶心', weight: 0.2, label: '恶心' },
      { kw: '呕吐', weight: 0.2, label: '呕吐' },
    ],
    labHits: [
      { marker: 'WBC', direction: 'high', weight: 0.2, label: '白细胞升高' },
      { marker: 'NEUT', direction: 'high', weight: 0.2, label: '中性粒升高' },
      { marker: 'CRP', direction: 'high', weight: 0.15, label: 'C反应蛋白升高' },
    ],
    historyHits: [],
    exams: ['腹部超声', '腹部CT', '血常规+CRP'],
  },
  {
    diagnosis: '2型糖尿病', icd10: 'E11.900', base: 0.1,
    symptomHits: [
      { kw: '多饮', weight: 0.5, label: '多饮' },
      { kw: '多尿', weight: 0.5, label: '多尿' },
      { kw: '多食', weight: 0.3, label: '多食' },
      { kw: '消瘦', weight: 0.3, label: '近期消瘦' },
      { kw: '乏力', weight: 0.1, label: '乏力' },
    ],
    labHits: [
      { marker: 'GLU', direction: 'high', weight: 0.4, label: '血糖升高' },
      { marker: 'HbA1c', direction: 'high', weight: 0.45, label: '糖化血红蛋白升高' },
    ],
    historyHits: [{ kw: '糖尿病', weight: 0.2 }, { kw: '家族史', weight: 0.1 }],
    exams: ['空腹血糖+OGTT', '糖化血红蛋白HbA1c', '尿微量白蛋白/肌酐比'],
  },
  {
    diagnosis: '消化性溃疡合并出血', icd10: 'K27.400', base: 0.1,
    symptomHits: [
      { kw: '黑便', weight: 0.6, label: '黑便' },
      { kw: '呕血', weight: 0.6, label: '呕血' },
      { kw: '上腹痛', weight: 0.3, label: '上腹痛' },
      { kw: '头晕', weight: 0.2, label: '头晕乏力' },
    ],
    labHits: [
      { marker: 'HGB', direction: 'low', weight: 0.3, label: '血红蛋白下降' },
      { marker: 'RBC', direction: 'low', weight: 0.2, label: '红细胞下降' },
    ],
    historyHits: [],
    exams: ['急诊胃镜', '血常规+网织红', '粪便潜血', '凝血功能'],
  },
  {
    diagnosis: '缺血性脑卒中（脑梗死）', icd10: 'I63.900', base: 0.1,
    symptomHits: [
      { kw: '偏瘫', weight: 0.7, label: '偏侧肢体无力' },
      { kw: '偏身麻木', weight: 0.5, label: '偏身麻木' },
      { kw: '言语不清', weight: 0.6, label: '言语不清' },
      { kw: '口角歪斜', weight: 0.6, label: '口角歪斜' },
      { kw: '突发头痛', weight: 0.3, label: '突发剧烈头痛' },
    ],
    labHits: [],
    historyHits: [{ kw: '高血压', weight: 0.2 }, { kw: '房颤', weight: 0.2 }],
    exams: ['急诊头颅CT', '头颅MRI+DWI', '血糖+凝血功能', '心电图排查房颤'],
  },
  {
    diagnosis: '尿路感染', icd10: 'N39.000', base: 0.1,
    symptomHits: [
      { kw: '尿频', weight: 0.5, label: '尿频' },
      { kw: '尿急', weight: 0.5, label: '尿急' },
      { kw: '尿痛', weight: 0.5, label: '尿痛' },
      { kw: '腰痛', weight: 0.2, label: '腰痛' },
      { kw: '发热', weight: 0.15, label: '发热' },
    ],
    labHits: [{ marker: 'WBC', direction: 'high', weight: 0.1, label: '白细胞升高' }],
    historyHits: [],
    exams: ['尿常规', '尿培养+药敏', '泌尿系超声(反复发作者)'],
  },
  {
    diagnosis: '支气管哮喘急性发作', icd10: 'J46.x00', base: 0.1,
    symptomHits: [
      { kw: '喘息', weight: 0.6, label: '喘息' },
      { kw: '呼吸困难', weight: 0.4, label: '呼吸困难' },
      { kw: '气促', weight: 0.3, label: '呼气性气促' },
      { kw: '咳嗽', weight: 0.1, label: '咳嗽变异性' },
    ],
    labHits: [],
    historyHits: [{ kw: '哮喘', weight: 0.3 }, { kw: '过敏', weight: 0.15 }],
    exams: ['肺功能+支气管舒张试验', '呼气峰流速PEF', '动脉血气(重症)'],
  },
];

/** 患者脱敏：仅保留尾 4 位（宪法第七章个人信息保护） */
function maskPatientIdLocal(patientId: string): string {
  const id = (patientId ?? '').trim();
  if (id.length === 0) return '***';
  if (id.length <= 4) return '****';
  return `***${id.slice(-4)}`;
}

/** 单条检验相对参考范围的方向 */
function labDirection(item: DiagnosisLabInput): 'high' | 'low' | null {
  if (!item || typeof item.value !== 'number' || Number.isNaN(item.value)) return null;
  if (item.value > (item.refHigh ?? Number.POSITIVE_INFINITY)) return 'high';
  if (item.value < (item.refLow ?? Number.NEGATIVE_INFINITY)) return 'low';
  return null;
}

/**
 * 智能诊断建议（纯函数，无 I/O、无随机；仅 generatedAt 取当前时间）。
 *
 * @param patientId   患者 ID（返回时脱敏，不回传明文）
 * @param symptoms    主诉症状列表
 * @param labResults  本次检验结果列表
 * @param history     既往病史（慢病/手术/过敏/吸烟/备注）
 */
export function generateDiagnosisSuggestions(
  patientId: string,
  symptoms: DiagnosisSymptomInput[],
  labResults: DiagnosisLabInput[],
  history: DiagnosisHistoryInput = {},
): Suggestions {
  const symList = Array.isArray(symptoms) ? symptoms : [];
  const labList = Array.isArray(labResults) ? labResults : [];
  const hist = history ?? {};

  // 归一化匹配文本
  const symText = symList.map((s) => `${s?.name ?? ''} ${s?.onset ?? ''}`).join(' ').toLowerCase();
  const histText = [
    ...(hist.chronicDiseases ?? []), ...(hist.surgeries ?? []),
    ...(hist.allergies ?? []), hist.notes ?? '', hist.smoking ? '吸烟' : '',
  ].join(' ').toLowerCase();

  // 检验按 code 索引（方向 + 展示值）
  const labMap = new Map<string, { item: DiagnosisLabInput; dir: 'high' | 'low' | null }>();
  for (const it of labList) {
    if (it?.markerCode) labMap.set(it.markerCode.toUpperCase(), { item: it, dir: labDirection(it) });
  }

  // 逐条规则计分
  interface Scored {
    rule: DiagnosisRule;
    score: number;
    evidence: string[];
  }
  const scored: Scored[] = [];
  for (const rule of DIAGNOSIS_RULES) {
    let score = rule.base;
    const evidence: string[] = [];

    for (const h of rule.symptomHits) {
      if (symText.includes(h.kw)) {
        score += h.weight;
        evidence.push(`症状：${h.label}`);
      }
    }
    for (const h of rule.labHits) {
      const hit = labMap.get(h.marker.toUpperCase());
      if (hit && hit.dir === h.direction) {
        score += h.weight;
        evidence.push(`检验：${h.label}（${hit.item.markerName ?? h.marker} ${hit.item.value}${hit.item.unit ?? ''}）`);
      }
    }
    for (const h of rule.historyHits) {
      if (histText.includes(h.kw)) {
        score += h.weight;
        evidence.push(`病史：合并「${h.kw}」`);
      }
    }

    if (evidence.length > 0) scored.push({ rule, score, evidence });
  }

  // 排序取 Top3
  scored.sort((a, b) => b.score - a.score);
  const top = scored.slice(0, 3);

  let candidates: DiagnosisCandidate[];
  if (top.length === 0) {
    candidates = [{
      rank: 1, diagnosis: '待查（信息不足）', icd10: 'R69.x00', probability: 1,
      supportingEvidence: ['输入信息不足：未命中任何诊断规则，建议补充主诉症状与检验结果'],
      differentialExams: ['完善病史采集与系统体格检查', '按需补充血/尿/便常规与影像学'],
    }];
  } else {
    const sum = top.reduce((acc, s) => acc + s.score, 0) || 1;
    candidates = top.map((s, i) => ({
      rank: i + 1,
      diagnosis: s.rule.diagnosis,
      icd10: s.rule.icd10,
      probability: Math.round((s.score / sum) * 100) / 100,
      supportingEvidence: s.evidence,
      differentialExams: s.rule.exams,
    }));
  }

  // 危险警示（独立扫描红旗症状 / 危急化验）
  const warnings: DiagnosisWarning[] = [];
  const hasHbLow = [...labMap.values()].some((l) => l.dir === 'low' && (l.item.markerCode?.toUpperCase() === 'HGB' || l.item.markerCode?.toUpperCase() === 'RBC'));
  const chestHighRisk = /胸痛|胸闷/.test(symText) && /大汗|濒死|压榨|放射|持续/.test(symText);
  const chestOnly = /胸痛|胸闷/.test(symText) && !chestHighRisk;
  const strokeRed = /偏瘫|偏身麻木|言语不清|口角歪斜|突发头痛/.test(symText);
  const bleedRed = /呕血|黑便|血便/.test(symText);
  const respRed = /呼吸困难|喘憋|发绀/.test(symText);

  if (chestHighRisk) {
    warnings.push({ level: 'critical', title: '高危胸痛，警惕急性心肌梗死/主动脉夹层', detail: '胸痛伴大汗/濒死感/放射痛/持续不缓解，属心血管急重症。' });
  } else if (chestOnly) {
    warnings.push({ level: 'high', title: '心源性胸痛待排', detail: '胸痛/胸闷须先排除心源性病因。' });
  }
  if (strokeRed) {
    warnings.push({ level: 'critical', title: '脑卒中红旗症状', detail: '突发偏瘫/口角歪斜/言语不清，须立即急诊，把握溶栓/取栓时间窗。' });
  }
  if (bleedRed) {
    warnings.push({ level: 'critical', title: '消化道出血征象', detail: '呕血/黑便提示上消化道出血，伴贫血时存在失血性休克风险。' });
  } else if (hasHbLow) {
    warnings.push({ level: 'high', title: '血红蛋白下降', detail: '提示贫血，需结合症状排查慢性失血或溶血。' });
  }
  if (respRed) {
    warnings.push({ level: 'high', title: '呼吸窘迫征象', detail: '呼吸困难/发绀，建议立即评估气道与氧合，查血气与胸片。' });
  }
  if (warnings.length === 0) {
    warnings.push({ level: 'info', title: '未识别到红旗症状', detail: '当前输入未触发急重症警示，仍须以执业医师面诊判断为准。' });
  }

  return {
    patientIdMasked: maskPatientIdLocal(patientId),
    candidates,
    warnings,
    generatedAt: new Date().toISOString(),
    disclaimer: '本建议由 AI 规则引擎生成，仅供参考，不构成医疗建议；最终诊断与处置须由执业医师结合病史、查体及辅助检查确定。',
  };
}
