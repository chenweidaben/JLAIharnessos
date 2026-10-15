/**
 * 健澜科技 jlmedaios - 药房审方智能助手 BFF 路由（M120-D）
 *
 * GET /api/v1/assistant/pharmacy?prescriptionId=xxx
 *   对指定处方做调配前风险扫描，返回相互作用 / 过敏匹配 / 用药史 / 处置建议。
 * 仅要求登录态（auth），不单独设权限码；统一错误信封。
 *
 * 只读扫描，不拦截处方、不改变审批状态；审方留痕与数据安全要求：
 * 依据宪法第七章，全程不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  PharmacyAssistantError,
  viewPharmacyAssistant,
} from '../aggregators/pharmacyAssistantAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

function mapError(err: unknown): Response {
  if (err instanceof PharmacyAssistantError) {
    const code =
      err.status === 401 ? ErrorCode.UNAUTHORIZED
      : err.status === 403 ? ErrorCode.FORBIDDEN
      : err.status === 404 ? ErrorCode.NOT_FOUND
      : ErrorCode.BAD_REQUEST;
    return json(fail(code, err.message), err.status);
  }
  return json(fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '失败'), 500);
}

export const assistantPharmacyRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/assistant/pharmacy',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const prescriptionId = c.query.get('prescriptionId') ?? '';
        return json(ok(await viewPharmacyAssistant(view, prescriptionId)));
      } catch (e) {
        return mapError(e);
      }
    },
  },
];
