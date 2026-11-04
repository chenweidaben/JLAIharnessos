/**
 * 健澜AI原生医院操作系统OS - P3-2 智能预问诊 + 智慧导诊路由
 *
 * 前缀 /api/v1/smart-triage（与 M164-C /api/v1/patient/smart-triage、M540 /api/v1/smart-triages 不冲突）：
 *  - POST /questionnaires                创建预问诊问卷（draft）
 *  - GET  /questionnaires/:id            查看
 *  - POST /questionnaires/:id/submit     提交 -> 生成 aiSummary
 *  - POST /questionnaires/:id/review     医生标记已阅
 *  - GET  /questionnaires?patientId=     患者列表
 *  - POST /triage                        智慧导诊
 *  - GET  /symptoms                      症状标签字典
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  TriageError,
  createQuestionnaire, getQuestionnaire, submitQuestionnaire, reviewQuestionnaire, listQuestionnaires,
  runTriage, listSymptoms,
} from '../aggregators/smartTriageV2Aggregator.js';

function mapError(err: unknown): Response {
  if (err instanceof TriageError) {
    const s = err.status;
    const code = s === 403 ? ErrorCode.FORBIDDEN : s === 404 ? ErrorCode.NOT_FOUND : s === 409 ? ErrorCode.CONFLICT : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), s);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

const qid = (c: Ctx): string => String(c.params?.id ?? '');

function assertPatientScope(c: Ctx, targetPatientId: string): void {
  const roles = c.user?.roles ?? [];
  const actorId = c.user?.id ?? '';
  if (roles.includes('patient') && actorId !== targetPatientId) {
    throw new TriageError(403, `患者 ${actorId} 无权访问 ${targetPatientId} 的数据`);
  }
}

export const smartTriageV2Routes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/smart-triage/questionnaires',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        if (roles.includes('doctor') && !roles.includes('admin')) throw new TriageError(403, 'doctor 不能创建预问诊问卷');
        const b = (await c.body()) as Record<string, unknown>;
        const patientId = String(b.patientId ?? '');
        assertPatientScope(c, patientId);
        return json(ok(createQuestionnaire({
          patientId,
          visitId: b.visitId === undefined ? undefined : String(b.visitId),
          appointmentId: b.appointmentId === undefined ? undefined : String(b.appointmentId),
          chiefComplaint: String(b.chiefComplaint ?? ''),
          presentIllness: String(b.presentIllness ?? ''),
          pastHistory: Array.isArray(b.pastHistory) ? (b.pastHistory as string[]) : [],
          allergyHistory: Array.isArray(b.allergyHistory) ? (b.allergyHistory as string[]) : [],
          currentMeds: Array.isArray(b.currentMeds) ? (b.currentMeds as string[]) : [],
          symptomTags: Array.isArray(b.symptomTags) ? (b.symptomTags as string[]) : [],
          durationDays: Number(b.durationDays ?? 0),
          severity: b.severity,
        })));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/smart-triage/questionnaires/:id',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const q = getQuestionnaire(qid(c));
        assertPatientScope(c, q.patientId);
        return json(ok(q));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/smart-triage/questionnaires/:id/submit',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const q = getQuestionnaire(qid(c));
        assertPatientScope(c, q.patientId);
        return json(ok(submitQuestionnaire(qid(c))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/smart-triage/questionnaires/:id/review',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const roles = c.user?.roles ?? [];
        if (!roles.some((r) => r === 'doctor' || r === 'admin')) throw new TriageError(403, 'review 需 doctor/admin');
        return json(ok(reviewQuestionnaire(qid(c))));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/smart-triage/questionnaires',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const u = new URL(c.req.url);
        const pid = u.searchParams.get('patientId') ?? '';
        if (pid) assertPatientScope(c, pid);
        return json(ok(listQuestionnaires(pid || undefined)));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'POST',
    path: '/api/v1/smart-triage/triage',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        const b = (await c.body()) as Record<string, unknown>;
        const patientId = String(b.patientId ?? '');
        assertPatientScope(c, patientId);
        return json(ok(runTriage(patientId, Array.isArray(b.symptomTags) ? (b.symptomTags as string[]) : [])));
      } catch (e) { return mapError(e); }
    },
  },
  {
    method: 'GET',
    path: '/api/v1/smart-triage/symptoms',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      try {
        return json(ok(listSymptoms()));
      } catch (e) { return mapError(e); }
    },
  },
];
