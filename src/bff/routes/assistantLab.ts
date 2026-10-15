/**
 * 健澜科技 jlmedaios - 检验检查智能解读 BFF 路由（M121-C）
 *
 * POST /api/v1/assistant/lab/interpret
 *   body: { patientId: string, results: LabResultItem[], prevResults?: LabResultItem[] }
 *   返回：异常检测 / 趋势分析 / 可能原因 / 随访建议四段结果。
 *
 * 仅要求登录态（auth），不单独设权限码；统一错误信封。
 * 规则引擎纯函数计算，不落库、不调大模型；患者标识返回时脱敏。
 * 数据安全与留痕要求：依据宪法第七章，全程只读、不落敏感明文。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getUserById, getUserRoleLinks } from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildLabInterpretation,
  type LabResultItem,
} from '../aggregators/labInterpretationAggregator.js';

async function requester(c: Ctx): Promise<AuthView | null> {
  if (!c.user) return null;
  const user = await getUserById(c.user.id);
  if (!user) return null;
  return buildAuthView(user, await getUserRoleLinks(user.id));
}

interface InterpretBody {
  patientId?: string;
  results?: LabResultItem[];
  prevResults?: LabResultItem[];
}

export const assistantLabRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/assistant/lab/interpret',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const view = await requester(c);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
      try {
        const body = await c.body<InterpretBody>().catch(() => ({} as InterpretBody));
        const patientId = (body?.patientId ?? '').trim();
        const results = Array.isArray(body?.results) ? body.results : [];
        const prevResults = Array.isArray(body?.prevResults) ? body.prevResults : [];
        if (!patientId) {
          return json(fail(ErrorCode.BAD_REQUEST, 'patientId 不能为空'), 400);
        }
        if (results.length === 0) {
          return json(fail(ErrorCode.BAD_REQUEST, 'results 不能为空（至少 1 条检验结果）'), 400);
        }
        // 纯函数规则引擎：医师 ID 取登录态，患者 ID 仅传入、返回时脱敏
        const data = buildLabInterpretation(view.id, patientId, results, prevResults);
        return json(ok(data));
      } catch (e) {
        return json(
          fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '检验解读失败'),
          500,
        );
      }
    },
  },
];
