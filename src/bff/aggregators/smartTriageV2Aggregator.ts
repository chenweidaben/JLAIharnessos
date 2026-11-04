/**
 * 健澜AI原生医院操作系统OS - P3-2 智能预问诊 + 智慧导诊
 *
 * - PreVisitQuestionnaire：患者填主诉/现病史/既往史/过敏史/用药史/症状标签，submit 时生成 aiSummary
 * - SymptomRule 规则表：症状 -> 科室推荐，emergency 红旗症状直急诊
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class TriageError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export type Severity = 'mild' | 'moderate' | 'severe';
export type QStatus = 'draft' | 'submitted' | 'reviewed-by-doctor';

export interface PreVisitQuestionnaire {
  questionnaireId: string;
  patientId: string;
  visitId?: string;
  appointmentId?: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string[];
  allergyHistory: string[];
  currentMeds: string[];
  symptomTags: string[];
  durationDays: number;
  severity: Severity;
  aiSummary?: string;
  status: QStatus;
  submittedAt?: string;
  reviewedAt?: string;
}

export interface SymptomRule {
  symptom: string;
  departmentId: string;
  departmentName: string;
  emergency: boolean;
  keywords: string[];
}

/** 内置症状 -> 科室规则表（>=15 条） */
export const SYMPTOM_RULES: SymptomRule[] = [
  { symptom: 'chest-pain', departmentId: 'cardiology', departmentName: '心血管内科', emergency: true, keywords: ['胸痛', '胸闷', '压榨样'] },
  { symptom: 'dyspnea', departmentId: 'respiratory', departmentName: '呼吸内科', emergency: true, keywords: ['呼吸困难', '喘憋'] },
  { symptom: 'consciousness-disorder', departmentId: 'neurology', departmentName: '神经内科', emergency: true, keywords: ['意识障碍', '昏迷'] },
  { symptom: 'heavy-bleeding', departmentId: 'emergency', departmentName: '急诊科', emergency: true, keywords: ['大出血', '呕血', '黑便'] },
  { symptom: 'fever', departmentId: 'infectious', departmentName: '感染科', emergency: false, keywords: ['发热', '高热'] },
  { symptom: 'cough', departmentId: 'respiratory', departmentName: '呼吸内科', emergency: false, keywords: ['咳嗽', '咳痰'] },
  { symptom: 'headache', departmentId: 'neurology', departmentName: '神经内科', emergency: false, keywords: ['头痛', '偏头痛'] },
  { symptom: 'abdominal-pain', departmentId: 'gastroenterology', departmentName: '消化内科', emergency: false, keywords: ['腹痛', '胃痛'] },
  { symptom: 'diarrhea', departmentId: 'gastroenterology', departmentName: '消化内科', emergency: false, keywords: ['腹泻', '拉肚子'] },
  { symptom: 'dizziness', departmentId: 'neurology', departmentName: '神经内科', emergency: false, keywords: ['头晕', '眩晕'] },
  { symptom: 'rash', departmentId: 'dermatology', departmentName: '皮肤科', emergency: false, keywords: ['皮疹', '红斑', '瘙痒'] },
  { symptom: 'joint-pain', departmentId: 'rheumatology', departmentName: '风湿免疫科', emergency: false, keywords: ['关节痛', '晨僵'] },
  { symptom: 'back-pain', departmentId: 'orthopedics', departmentName: '骨科', emergency: false, keywords: ['腰痛', '背痛'] },
  { symptom: 'ankle-swelling', departmentId: 'nephrology', departmentName: '肾内科', emergency: false, keywords: ['下肢水肿', '眼睑肿'] },
  { symptom: 'palpitation', departmentId: 'cardiology', departmentName: '心血管内科', emergency: false, keywords: ['心悸', '心慌'] },
  { symptom: 'vision-blur', departmentId: 'ophthalmology', departmentName: '眼科', emergency: false, keywords: ['视物模糊', '视力下降'] },
];

interface TriageDept { departmentId: string; departmentName: string; score: number; reason: string[]; }

export interface TriageResult {
  triageId: string;
  patientId: string;
  symptomTags: string[];
  recommendedDepartments: TriageDept[];
  emergency: boolean;
  triagedAt: string;
}

const qs: PreVisitQuestionnaire[] = [];
const triages: TriageResult[] = [];
let seq = 0;

function pickSeverity(v: unknown): Severity {
  if (v !== 'mild' && v !== 'moderate' && v !== 'severe') throw new TriageError(400, `severity 非法：${String(v)}`);
  return v as Severity;
}

// ---------- Questionnaire ----------
export function createQuestionnaire(input: {
  patientId: string; visitId?: string; appointmentId?: string;
  chiefComplaint: string; presentIllness: string;
  pastHistory?: string[]; allergyHistory?: string[]; currentMeds?: string[];
  symptomTags: string[]; durationDays: number; severity: unknown;
}): PreVisitQuestionnaire {
  if (!input.patientId) throw new TriageError(400, 'patientId 必填');
  if (!input.chiefComplaint) throw new TriageError(400, 'chiefComplaint 必填');
  if (input.chiefComplaint.length > 500) throw new TriageError(400, 'chiefComplaint 不能超过 500 字');
  if (!Array.isArray(input.symptomTags) || input.symptomTags.length === 0) throw new TriageError(400, 'symptomTags 至少 1 个');
  const sev = pickSeverity(input.severity);
  seq += 1;
  const q: PreVisitQuestionnaire = {
    questionnaireId: `Q-${String(seq).padStart(5, '0')}`,
    patientId: input.patientId, visitId: input.visitId, appointmentId: input.appointmentId,
    chiefComplaint: input.chiefComplaint, presentIllness: input.presentIllness ?? '',
    pastHistory: input.pastHistory ?? [], allergyHistory: input.allergyHistory ?? [], currentMeds: input.currentMeds ?? [],
    symptomTags: input.symptomTags, durationDays: input.durationDays, severity: sev,
    status: 'draft',
  };
  qs.push(q);
  return q;
}

function genSummary(q: PreVisitQuestionnaire): string {
  return `主诉：${q.chiefComplaint}；现病史：${q.presentIllness}；病程：${q.durationDays} 天；严重度：${q.severity}；既往史：${q.pastHistory.join('、') || '无'}；过敏史：${q.allergyHistory.join('、') || '无'}；当前用药：${q.currentMeds.join('、') || '无'}；症状标签：${q.symptomTags.join('、')}`;
}

export function submitQuestionnaire(questionnaireId: string): PreVisitQuestionnaire {
  const q = qs.find((x) => x.questionnaireId === questionnaireId);
  if (!q) throw new TriageError(404, `问卷不存在：${questionnaireId}`);
  if (q.status !== 'draft') throw new TriageError(409, `问卷已 ${q.status}，不能重复提交`);
  q.aiSummary = genSummary(q);
  q.status = 'submitted';
  q.submittedAt = new Date().toISOString();
  return q;
}

export function reviewQuestionnaire(questionnaireId: string): PreVisitQuestionnaire {
  const q = qs.find((x) => x.questionnaireId === questionnaireId);
  if (!q) throw new TriageError(404, `问卷不存在：${questionnaireId}`);
  if (q.status !== 'submitted') throw new TriageError(409, `问卷未提交，不能 review（当前 ${q.status}）`);
  q.status = 'reviewed-by-doctor';
  q.reviewedAt = new Date().toISOString();
  return q;
}

export function getQuestionnaire(questionnaireId: string): PreVisitQuestionnaire {
  const q = qs.find((x) => x.questionnaireId === questionnaireId);
  if (!q) throw new TriageError(404, `问卷不存在：${questionnaireId}`);
  return q;
}

export function listQuestionnaires(patientId?: string): PreVisitQuestionnaire[] {
  let arr = [...qs];
  if (patientId) arr = arr.filter((q) => q.patientId === patientId);
  return arr.sort((a, b) => (a.questionnaireId < b.questionnaireId ? 1 : -1));
}

// ---------- Triage ----------
export function runTriage(patientId: string, symptomTags: string[]): TriageResult {
  if (!patientId) throw new TriageError(400, 'patientId 必填');
  if (!Array.isArray(symptomTags) || symptomTags.length === 0) throw new TriageError(400, 'symptomTags 不能为空');
  const deptMap = new Map<string, TriageDept>();
  let emergency = false;
  for (const tag of symptomTags) {
    const rule = SYMPTOM_RULES.find((r) => r.symptom === tag);
    if (rule) {
      if (rule.emergency) emergency = true;
      const key = rule.departmentId;
      const cur = deptMap.get(key) ?? { departmentId: rule.departmentId, departmentName: rule.departmentName, score: 0, reason: [] as string[] };
      cur.score += 1;
      cur.reason.push(...rule.keywords);
      deptMap.set(key, cur);
    }
  }
  let recommended = [...deptMap.values()].sort((a, b) => b.score - a.score).slice(0, 3);
  if (recommended.length === 0) {
    recommended = [{ departmentId: 'general', departmentName: '全科医学科', score: 1, reason: ['症状未匹配，建议先全科初诊'] }];
  }
  if (emergency) {
    recommended.unshift({ departmentId: 'emergency', departmentName: '急诊科', score: 999, reason: ['红旗症状：建议立即急诊'] });
    recommended = recommended.slice(0, 4);
  }
  seq += 1;
  const r: TriageResult = {
    triageId: `T-${String(seq).padStart(5, '0')}`,
    patientId, symptomTags, recommendedDepartments: recommended, emergency, triagedAt: new Date().toISOString(),
  };
  triages.push(r);
  return r;
}

export function listSymptoms(): SymptomRule[] { return [...SYMPTOM_RULES]; }

export function __resetStore(): void { qs.length = 0; triages.length = 0; seq = 0; }
