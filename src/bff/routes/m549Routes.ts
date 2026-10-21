/**
 * 健澜科技 jlmedaios - M549 新标准 P1：智慧服务三级满意度调查 4 端点
 *
 * GET  /api/v1/satisfaction/templates      4 模板目录
 * GET  /api/v1/satisfaction/responses?visitId=&templateCode=  答卷列表（submittedAt 倒序）
 * POST /api/v1/satisfaction/responses      提交答卷（后端自动算 averageScore=5 项均值 1 位小数）
 * GET  /api/v1/satisfaction/stats?templateCode=   统计（totalResponses/avgScore/responseRate=85% 种子）
 *
 * 说明：satisfaction.ts 已注册 /api/v1/satisfaction/:id 动态路由，本路由静态路径须先于其命中，
 * 故 m549Routes 在 server.ts spread 中位于 satisfactionRoutes 之前（M460 同款做法）。
 * 种子：4 模板 × 5 份答卷 = 20 份，内存 Map 短路，不连 PostgreSQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type TemplateCode = 'inpatient' | 'outpatient' | 'emergency' | 'surgery';

interface Template {
  code: TemplateCode;
  name: string;
  questionCount: number;
}

interface Scores {
  overall: number;
  doctor: number;
  nurse: number;
  environment: number;
  convenience: number;
}

interface SurveyResponse {
  id: string;
  templateCode: TemplateCode;
  visitId: string;
  scores: Scores;
  comment: string | null;
  submittedAt: string;
  averageScore: number;
}

// ============================== 4 模板 ==============================

const templates: Template[] = [
  { code: 'inpatient', name: 'inpatient_survey', questionCount: 5 },
  { code: 'outpatient', name: 'outpatient_survey', questionCount: 5 },
  { code: 'emergency', name: 'emergency_survey', questionCount: 5 },
  { code: 'surgery', name: 'surgery_survey', questionCount: 5 },
];

const VALID_TEMPLATES = new Set<string>(templates.map((t) => t.code));

// ============================== 20 份答卷种子 ==============================

const responses: SurveyResponse[] = [];
let satSeq = 0;

function addResponse(templateCode: TemplateCode, visitId: string, scores: Scores, comment: string | null, submittedAt: string): void {
  satSeq += 1;
  const avg = Number(((scores.overall + scores.doctor + scores.nurse + scores.environment + scores.convenience) / 5).toFixed(1));
  responses.push({
    id: `SAT-${String(satSeq).padStart(3, '0')}`,
    templateCode, visitId, scores, comment, submittedAt, averageScore: avg,
  });
}
function seedResponses(): void {
  const mk = (v: number): Scores => ({ overall: v, doctor: v, nurse: v, environment: v, convenience: v });
  // inpatient × 5
  addResponse('inpatient', 'V2026100101', mk(5), '医护很耐心', '2026-10-15T10:00:00+08:00');
  addResponse('inpatient', 'V2026100102', mk(4), '整体满意', '2026-10-16T10:00:00+08:00');
  addResponse('inpatient', 'V2026100103', mk(3), '等候偏久', '2026-10-17T10:00:00+08:00');
  addResponse('inpatient', 'V2026100104', mk(5), null, '2026-10-18T10:00:00+08:00');
  addResponse('inpatient', 'V2026100105', mk(4), '病房环境好', '2026-10-19T10:00:00+08:00');
  // outpatient × 5
  addResponse('outpatient', 'V2026100201', mk(4), '挂号便捷', '2026-10-15T11:00:00+08:00');
  addResponse('outpatient', 'V2026100202', mk(5), null, '2026-10-16T11:00:00+08:00');
  addResponse('outpatient', 'V2026100203', mk(2), '排队时间长', '2026-10-17T11:00:00+08:00');
  addResponse('outpatient', 'V2026100204', mk(4), '医生解释清楚', '2026-10-18T11:00:00+08:00');
  addResponse('outpatient', 'V2026100205', mk(3), '缴费窗口少', '2026-10-19T11:00:00+08:00');
  // emergency × 5
  addResponse('emergency', 'V2026100301', mk(5), '抢救及时', '2026-10-15T12:00:00+08:00');
  addResponse('emergency', 'V2026100302', mk(4), null, '2026-10-16T12:00:00+08:00');
  addResponse('emergency', 'V2026100303', mk(3), '留观床位紧张', '2026-10-17T12:00:00+08:00');
  addResponse('emergency', 'V2026100304', mk(5), '护士专业', '2026-10-18T12:00:00+08:00');
  addResponse('emergency', 'V2026100305', mk(4), '救护车响应快', '2026-10-19T12:00:00+08:00');
  // surgery × 5
  addResponse('surgery', 'V2026100401', mk(5), '手术很成功', '2026-10-15T13:00:00+08:00');
  addResponse('surgery', 'V2026100402', mk(4), '术后护理到位', '2026-10-16T13:00:00+08:00');
  addResponse('surgery', 'V2026100403', mk(5), null, '2026-10-17T13:00:00+08:00');
  addResponse('surgery', 'V2026100404', mk(3), '镇痛偏弱', '2026-10-18T13:00:00+08:00');
  addResponse('surgery', 'V2026100405', mk(4), '麻醉苏醒平稳', '2026-10-19T13:00:00+08:00');
}
seedResponses();

// ============================== 1. GET /api/v1/satisfaction/templates ==============================

async function handleTemplateList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  return json(ok({ items: templates, totalCount: templates.length }), 200);
}

// ============================== 2. GET /api/v1/satisfaction/responses ==============================

async function handleResponseList(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const visitId = (c.query.get('visitId') ?? '').trim();
  const templateCode = (c.query.get('templateCode') ?? '').trim();
  let rows = responses.slice();
  if (visitId) rows = rows.filter((r) => r.visitId === visitId);
  if (templateCode) rows = rows.filter((r) => r.templateCode === templateCode);
  rows = rows.sort((a, b) => b.submittedAt.localeCompare(a.submittedAt));
  return json(ok({ items: rows, totalCount: rows.length }), 200);
}

// ============================== 3. POST /api/v1/satisfaction/responses ==============================

function scoreValid(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v >= 1 && v <= 5;
}

async function handleResponseCreate(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const templateCode = body.templateCode;
  const visitId = body.visitId;
  const scoresRaw = body.scores;
  const comment = body.comment;

  if (
    typeof templateCode !== 'string' || !VALID_TEMPLATES.has(templateCode) ||
    typeof visitId !== 'string' || !visitId.trim() ||
    !scoresRaw || typeof scoresRaw !== 'object' || Array.isArray(scoresRaw)
  ) {
    return json({ code: 400, message: 'invalid payload' }, 400);
  }

  const s = scoresRaw as Record<string, unknown>;
  if (!scoreValid(s.overall) || !scoreValid(s.doctor) || !scoreValid(s.nurse) || !scoreValid(s.environment) || !scoreValid(s.convenience)) {
    return json({ code: 400, message: 'scores out of range 1-5' }, 400);
  }

  satSeq += 1;
  const scores: Scores = {
    overall: s.overall, doctor: s.doctor, nurse: s.nurse, environment: s.environment, convenience: s.convenience,
  };
  const avg = Number(((scores.overall + scores.doctor + scores.nurse + scores.environment + scores.convenience) / 5).toFixed(1));
  const rec: SurveyResponse = {
    id: `SAT-${String(satSeq).padStart(3, '0')}`,
    templateCode: templateCode as TemplateCode,
    visitId: visitId.trim(),
    scores,
    comment: typeof comment === 'string' && comment.trim() ? comment.trim() : null,
    submittedAt: new Date().toISOString(),
    averageScore: avg,
  };
  responses.push(rec);
  return json(ok(rec), 200);
}

// ============================== 4. GET /api/v1/satisfaction/stats ==============================

async function handleStats(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const templateCode = (c.query.get('templateCode') ?? '').trim();
  let rows = responses.slice();
  if (templateCode) rows = rows.filter((r) => r.templateCode === templateCode);
  const total = rows.length;
  const avg = total > 0
    ? Number((rows.reduce((sum, r) => sum + r.averageScore, 0) / total).toFixed(1))
    : 0;
  return json(
    ok({
      templateCode: templateCode || 'all',
      totalResponses: total,
      avgScore: avg,
      responseRate: '85%',
    }),
    200,
  );
}

export const m549Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/satisfaction/templates', handle: handleTemplateList, auth: true },
  { method: 'GET', path: '/api/v1/satisfaction/responses', handle: handleResponseList, auth: true },
  { method: 'POST', path: '/api/v1/satisfaction/responses', handle: handleResponseCreate, auth: true },
  { method: 'GET', path: '/api/v1/satisfaction/stats', handle: handleStats, auth: true },
];
