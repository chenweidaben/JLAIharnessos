/**
 * 健澜科技 jlmedaios - AI 病历自动生成 BFF 路由（M144-B）
 *
 * 【AI核心能力深化】医生修改后用于模型优化：
 *  - POST /api/v1/ai/generate-record          医师口述/批注 → AI 六段病历草稿；
 *  - POST /api/v1/ai/generate-record/:id/improve 医师复核修改 → 逐段 diff 留痕并累计学习信号。
 *
 * 严谨性：纯函数本地规则引擎确定性生成，不依赖外部大模型；草稿仅起稿辅助，须医师本人
 * 修改复核后方可归档；统一错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  generateMedicalRecord,
  improveMedicalRecord,
  getLearningSummary,
  type AiPatientInfo,
  type AiRecordGenSections,
} from '../aggregators/aiRecordAggregator';

/** POST /generate-record 请求体 */
interface GenerateBody {
  visitId?: string;
  doctorNotes?: string | string[];
  patientInfo?: AiPatientInfo;
}

/** POST /generate-record/:id/improve 请求体 */
interface ImproveBody {
  sections?: Record<string, string>;
  note?: string;
}

const WRITE_PERMISSION = 'medical_record:write';

/** 生成草稿 */
async function handleGenerate(c: Ctx): Promise<Response> {
  const denied = requirePermissionCode(c, WRITE_PERMISSION);
  if (denied) return denied;

  const body = (await c.body()) as GenerateBody;
  const visitId = (body.visitId ?? '').trim();
  if (!visitId) {
    return json(fail(ErrorCode.BAD_REQUEST, '缺少 visitId'), 400);
  }
  const draft = generateMedicalRecord(visitId, body.doctorNotes ?? '', body.patientInfo ?? {});
  return json(ok(draft));
}

/** 医师修改复核：diff 留痕 + 学习信号累计 */
async function handleImprove(c: Ctx): Promise<Response> {
  const denied = requirePermissionCode(c, WRITE_PERMISSION);
  if (denied) return denied;

  const recordId = (c.params.id ?? '').trim();
  if (!recordId) {
    return json(fail(ErrorCode.BAD_REQUEST, '缺少 recordId'), 400);
  }
  const body = (await c.body()) as ImproveBody;
  if (!body.sections || typeof body.sections !== 'object') {
    return json(fail(ErrorCode.BAD_REQUEST, '缺少医师修改后的 sections'), 400);
  }
  // 仅取六段已知键，防御性过滤，避免注入多余字段
  const raw = body.sections as Record<string, unknown>;
  const pick = (k: keyof AiRecordGenSections): string =>
    typeof raw[k] === 'string' ? (raw[k] as string) : '';
  const sections: AiRecordGenSections = {
    chiefComplaint: pick('chiefComplaint'),
    presentIllness: pick('presentIllness'),
    pastHistory: pick('pastHistory'),
    physicalExam: pick('physicalExam'),
    diagnosis: pick('diagnosis'),
    treatmentPlan: pick('treatmentPlan'),
  };
  improveMedicalRecord(recordId, { sections, note: body.note });
  return json(ok({ recordId, learning: getLearningSummary() }));
}

export const aiRecordRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/ai/generate-record',
    handle: (c: Ctx) => handleGenerate(c),
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/ai/generate-record/:id/improve',
    handle: (c: Ctx) => handleImprove(c),
    auth: true,
  },
];
