/**
 * 健澜科技 jlmedaios - 党建与文化深化 BFF 路由（M178-D · 医院管理深化）
 *
 * 【财务人力行政党建】党建文化要务实，不能形式主义。
 *   GET /api/v1/party/culture   深度党建文化看板（四维度 + 反形式主义校验 +
 *                               医德考评等次分布 + 文化活动问效）
 *
 * 仅 admin 角色可访问（requireRole 内部处理 401/403）——党建文化是行政口
 *   管理数据，不对普通医护开放写权限。业务内核为 partyCultureAggregator 的
 *   纯函数；本层只做参数收束、身份注入，不另写业务规则。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  buildDeepPartyCulture,
  listCultureEvents,
  listOrganizedActivities,
} from '../aggregators/partyCultureAggregator';

/** GET /api/v1/party/culture：深度党建文化看板 */
async function handleGetCulture(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const view = buildDeepPartyCulture();
    return json(
      ok(
        {
          culture: view,
          activities: listOrganizedActivities(),
          cultureEvents: listCultureEvents(),
        },
        'ok',
      ),
    );
  } catch (e) {
    console.error(`[partyCulture] GET /party/culture [${c.traceId}]`, e);
    return json(
      fail(ErrorCode.INTERNAL_ERROR, e instanceof Error ? e.message : '党建文化看板生成失败', c.traceId),
      500,
    );
  }
}

export const partyCultureRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/party/culture', auth: true, handle: handleGetCulture },
];
