import type { AuthView } from '../view/userView.js';
import * as repo from '@/db/repositories/emrAssessmentRepo';

export class EmrAssessmentError extends Error {
  constructor(public status: number, message: string) { super(message); }
}

export async function listView(view: AuthView) {
  if (!view.permissions.includes('emr_assessment:view')) throw new EmrAssessmentError(403, '无查看权限');
  return repo.listAll();
}

export async function updateView(view: AuthView, code: string, value: number) {
  if (!view.permissions.includes('emr_assessment:view')) throw new EmrAssessmentError(403, '无权限');
  const m = await repo.updateValue(code, value);
  if (!m) throw new EmrAssessmentError(404, '指标不存在');
  return m;
}
