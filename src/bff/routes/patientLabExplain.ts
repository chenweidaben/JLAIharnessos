/**
 * 健澜科技 jlmedaios - 检验报告患者通俗解读 BFF 路由（M122-B）
 *
 * 依据宪法：第二十一条国家发展医疗卫生事业、保护人民健康；
 * 本接口面向患者本人，把专业检验结果翻译成大白话，帮助知情与自我管理。
 *
 * GET /api/v1/patient/lab-explain?reportId=xxx
 * 需患者门户权限（patient_portal:view）。AI 仅辅助，不出具诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { requirePermissionCode } from '../middleware/auth';
import {
  PatientLabExplainError,
  explainLabReportByReportId,
} from '../aggregators/patientLabExplainAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PatientLabExplainError) {
    const code =
      err.status === 404
        ? ErrorCode.NOT_FOUND
        : err.status === 403
          ? ErrorCode.FORBIDDEN
          : err.status === 400
            ? ErrorCode.BAD_REQUEST
            : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  const message = err instanceof Error ? err.message : '检验报告解读失败';
  return json(fail(ErrorCode.INTERNAL_ERROR, message), 500);
}

export const patientLabExplainRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patient/lab-explain',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      // 权限边界：仅患者门户账号可访问本人报告解读。
      const denied = requirePermissionCode(c, 'patient_portal:view');
      if (denied) return denied;
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);

      const reportId = c.query.get('reportId') ?? '';
      try {
        // 患者画像目前仅传基础空画像；后续可从档案补充年龄/性别/慢病。
        const data = await explainLabReportByReportId(reportId, {});
        return json(ok(data));
      } catch (err) {
        return mapError(err);
      }
    },
  },
];
