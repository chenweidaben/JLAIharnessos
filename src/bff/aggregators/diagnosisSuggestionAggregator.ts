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
