/**
 * 健澜科技 jlmedaios - 手术核查表聚合器（M82-A）
 * 手术室录入各阶段；缺项则 failed 不通过；越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import {
  createChecklist, getById, getBySurgery, updateStage, type StageInput,
} from '../../db/repositories/surgicalChecklistRepo.js';
import { isPassed, missingItems, type ChecklistState } from '../../medical-tools/nursing/surgicalChecklist.js';

export class SurgicalCheckError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'SurgicalCheckError';
  }
}
const forbidden = (m: string) => new SurgicalCheckError(403, 'FORBIDDEN', m);
const badRequest = (m: string) => new SurgicalCheckError(400, 'BAD_REQUEST', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

function toState(c: {
  signinComplete: boolean; timeoutComplete: boolean; signoutComplete: boolean;
  patientConfirmed: boolean; siteMarked: boolean; procedureConfirmed: boolean;
  allergyConfirmed: boolean; antibioticGiven: boolean; bloodPrepared: boolean; instrumentsCounted: boolean;
}): ChecklistState {
  return {
    signinComplete: c.signinComplete, timeoutComplete: c.timeoutComplete, signoutComplete: c.signoutComplete,
    patientConfirmed: c.patientConfirmed, siteMarked: c.siteMarked, procedureConfirmed: c.procedureConfirmed,
    allergyConfirmed: c.allergyConfirmed, antibioticGiven: c.antibioticGiven, bloodPrepared: c.bloodPrepared,
    instrumentsCounted: c.instrumentsCounted,
  };
}

/** 建核查表。 */
export async function createView(auth: AuthView, surgeryId: string) {
  assertPermission(auth, 'surgical_check:complete');
  if (auth.dataScope !== 'all') throw forbidden('超出数据权限范围');
  if (!surgeryId) throw badRequest('surgeryId 不能为空');
  return createChecklist(surgeryId);
}

/** 录入阶段（signin/timeout/signout）；三阶段齐全且无缺项 → passed，否则 failed。 */
export async function stageView(auth: AuthView, id: string, stage: 'signin' | 'timeout' | 'signout', input: StageInput) {
  assertPermission(auth, 'surgical_check:complete');
  const candidate = (await getBySurgery(id)) ?? (await getById(id));
  if (!candidate) throw badRequest('核查单不存在');
  const merged = {
    ...candidate,
    ...input,
    signinComplete: stage === 'signin' ? true : Boolean(candidate.signinComplete),
    timeoutComplete: stage === 'timeout' ? true : Boolean(candidate.timeoutComplete),
    signoutComplete: stage === 'signout' ? true : Boolean(candidate.signoutComplete),
  };
  const state = toState(merged as Parameters<typeof toState>[0]);
  const status = missingItems(state).length === 0 && isPassed(state) ? 'passed' : 'failed';
  return updateStage(id, stage, input, status);
}
