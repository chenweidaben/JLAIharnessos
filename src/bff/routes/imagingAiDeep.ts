/**
 * 健澜科技 jlmedaios - 医学影像 AI 能力深化 · 病灶级 BFF 路由（M152-A）
 *
 * POST /api/v1/imaging/ai/lesion
 *   body: { modality: 'CT'|'MRI'|'X-ray'|'Ultrasound', studyUid: string, imageFeatures: {...} }
 *   返回: { analysis: LesionAnalysis, report: StructuredReport }
 *
 * 【AI能力深化】在 M138-A 初筛基础上输出病灶级刻画（定位/大小/置信度/鉴别诊断）。
 *
 * 医疗安全红线：
 *   - AI 只是辅助，最终诊断由医生确认；返回值自带 disclaimer；
 *   - 不直连 PACS、不调 LLM、不写患者诊断结论；
 *   - 医师确认动作（前端按钮）走后续审计流程，不在本接口内落诊断。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  analyzeLesion,
  generateImagingStructuredReport,
  type ImagingModality,
  type LesionImageFeatures,
} from '../aggregators/imagingAiDeepAggregator.js';

const VALID_MODALITIES: readonly ImagingModality[] = ['CT', 'MRI', 'X-ray', 'Ultrasound'];

class ImagingDeepError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ImagingDeepError';
  }
}

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof ImagingDeepError) {
    const code =
      err.status === 400
        ? ErrorCode.BAD_REQUEST
        : err.status === 401
          ? ErrorCode.UNAUTHORIZED
          : ErrorCode.INTERNAL_ERROR;
    return json(fail(code, err.message), err.status);
  }
  return json(
    fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '影像病灶分析失败'),
    500,
  );
}

export const imagingAiDeepRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/imaging/ai/lesion',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录或用户不存在'), 401);

      try {
        const body = (await c.body().catch(() => ({}))) as {
          modality?: string;
          studyUid?: string;
          imageFeatures?: LesionImageFeatures;
        };

        if (!body.modality || !VALID_MODALITIES.includes(body.modality as ImagingModality)) {
          throw new ImagingDeepError(
            400,
            'BAD_REQUEST',
            'modality 必须是 CT / MRI / X-ray / Ultrasound 之一',
          );
        }
        if (!body.studyUid || typeof body.studyUid !== 'string') {
          throw new ImagingDeepError(400, 'BAD_REQUEST', 'studyUid 不能为空');
        }

        const modality = body.modality as ImagingModality;
        const features: LesionImageFeatures =
          body.imageFeatures && typeof body.imageFeatures === 'object' ? body.imageFeatures : {};

        // 【AI能力深化】纯函数：病灶级分析 + 结构化报告草稿
        const analysis = analyzeLesion(features, modality);
        const report = generateImagingStructuredReport(body.studyUid, analysis.lesions);

        return json(ok({ analysis, report }));
      } catch (err) {
        return mapError(err);
      }
    },
  },
];
