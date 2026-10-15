/**
 * 健澜科技 jlmedaios - M130-A 病历质控智能审核路由（核心业务深化，仅 admin）
 *
 * 【核心业务深化】
 *  - POST /api/v1/admin/records/audit
 *      body: { recordId?: string, recordContent: MedicalRecordContent }
 *      对一份病历跑五项质控规则（主诉完整性 / 现病史时间线 / 鉴别诊断 /
 *      诊疗计划 / 用药指征），返回逐项结果、评分与"建议"结论；
 *      结果落 medmuse.record_quality_check，status='pending'，待人工确认。
 *
 * 生产安全加固：
 *  - requireRole(c, 'admin')：未登录 401、非管理员 403；
 *  - 审核结论始终为"建议"，系统不自动判退/归档，闭环靠人工确认；
 *  - recordContent 结构非法（缺字段/类型错）一律 400，不臆造数据。
 *
 * 本文件导出 adminRecordAuditRoutes，由 server.ts 统一接线。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  runAudit,
  type MedicalRecordContent,
} from '../aggregators/recordQualityAggregator.js';

/** 校验并规范化请求体里的病历内容；非法即抛错 */
function parseRecordContent(raw: unknown): MedicalRecordContent {
  if (typeof raw !== 'object' || raw === null) {
    throw new Error('recordContent 必须是对象');
  }
  const o = raw as Record<string, unknown>;
  const medications = Array.isArray(o.medications)
    ? o.medications.map((m) => {
        const mm = (m ?? {}) as Record<string, unknown>;
        return {
          name: typeof mm.name === 'string' ? mm.name : '',
          indication: typeof mm.indication === 'string' ? mm.indication : '',
        };
      })
    : [];
  return {
    chiefComplaint: typeof o.chiefComplaint === 'string' ? o.chiefComplaint : '',
    presentIllness: typeof o.presentIllness === 'string' ? o.presentIllness : '',
    differentialDiagnosis:
      typeof o.differentialDiagnosis === 'string' ? o.differentialDiagnosis : '',
    treatmentPlan: typeof o.treatmentPlan === 'string' ? o.treatmentPlan : '',
    medications,
  };
}

/** POST /api/v1/admin/records/audit */
async function handleAudit(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: { recordId?: unknown; recordContent?: unknown };
  try {
    body = await c.body<typeof body>();
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体不是合法 JSON'), 400);
  }

  let recordContent: MedicalRecordContent;
  try {
    recordContent = parseRecordContent(body?.recordContent);
  } catch (e) {
    return json(
      fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : 'recordContent 非法'),
      400,
    );
  }

  const recordId = typeof body?.recordId === 'string' ? body.recordId : '';
  const createdBy = c.user?.id ?? c.user?.name ?? 'unknown';

  try {
    const result = await runAudit(createdBy, recordId, recordContent);
    return json(ok(result, '病历质控审核完成；结果为建议，需人工确认'));
  } catch (e) {
    return json(
      fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '病历质控审核失败'),
      500,
    );
  }
}

export const adminRecordAuditRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/admin/records/audit',
    auth: true,
    handle: handleAudit,
  },
];
