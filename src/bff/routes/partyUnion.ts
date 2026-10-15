/**
 * 健澜科技 jlmedaios - 党建工会管理 BFF 路由（M140-D · 医院管理深化）
 *
 * 【医院管理深化】党建工会活动留痕：
 *   GET  /api/v1/admin/party-union   活动台账全量留痕 + ?year=YYYY 年度报告
 *   POST /api/v1/admin/party-union   登记一场活动（党支部学习/主题党日/工会福利/职工文体/志愿服务）
 *
 * 仅 admin 角色可访问（requireRole 内部处理 401/403）——活动留痕是行政口数据，
 *   不对普通医护开放写权限。业务内核为 partyUnionAggregator 的纯函数，
 *   本层只做参数收敛、身份注入与 best-effort 落库，不另写业务规则。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  PARTY_ACTIVITY_TYPES,
  getAnnualActivityReport,
  listPartyActivities,
  persistPartyActivity,
  registerPartyActivity,
  type PartyActivityType,
} from '../aggregators/partyUnionAggregator';

/** 登记活动请求体 */
interface RegisterBody {
  /** 活动类型：党支部学习/主题党日/工会福利/职工文体/志愿服务 */
  type?: PartyActivityType;
  /** 活动主题标题 */
  title?: string;
  /** 组织者 id；缺省 = 当前登录用户 */
  organizerId?: string;
  /** 活动日期 YYYY-MM-DD */
  date?: string;
  /** 活动地点 */
  location?: string;
  /** 参与人员名单 */
  participants?: string[];
}

/** GET /api/v1/admin/party-union：活动台账 + 年度报告 */
async function handleList(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  // ?year=YYYY 指定报告年份；缺省取当前自然年
  const now = new Date();
  const year = Number(c.query.get('year') || now.getFullYear());

  try {
    const report = getAnnualActivityReport(year);
    return json(ok({ list: listPartyActivities(), report }, 'ok'));
  } catch (e) {
    return json(
      fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '年度报告生成失败', c.traceId),
      400,
    );
  }
}

/** POST /api/v1/admin/party-union：登记一场党建工会活动 */
async function handleCreate(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  let body: RegisterBody;
  try {
    body = await c.body<RegisterBody>();
  } catch {
    return json(fail(ErrorCode.BAD_REQUEST, '请求体必须为合法 JSON', c.traceId), 400);
  }

  if (!body.type || !PARTY_ACTIVITY_TYPES.includes(body.type)) {
    return json(
      fail(
        ErrorCode.BAD_REQUEST,
        `type 必须为 ${PARTY_ACTIVITY_TYPES.join(' / ')} 之一`,
        c.traceId,
      ),
      400,
    );
  }
  if (!body.title || !body.title.trim()) {
    return json(fail(ErrorCode.BAD_REQUEST, '活动标题 title 不能为空', c.traceId), 400);
  }

  // 组织者缺省取当前登录用户：谁登录、谁登记、谁留痕
  const organizerId = body.organizerId?.trim() || c.user?.id || '';
  if (!organizerId) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录，无法登记活动', c.traceId), 401);
  }

  try {
    const activity = registerPartyActivity(
      body.type,
      body.title.trim(),
      organizerId,
      body.date ?? '',
      body.location ?? '',
      Array.isArray(body.participants) ? body.participants : [],
    );
    // best-effort 落库活动留痕，失败不阻断
    await persistPartyActivity(activity);
    return json(ok(activity, '活动已登记，留痕完成'), 201);
  } catch (e) {
    console.error(`[partyUnion] POST /party-union [${c.traceId}]`, e);
    return json(
      fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '活动登记失败', c.traceId),
      400,
    );
  }
}

export const partyUnionRoutes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/admin/party-union', auth: true, handle: handleList },
  { method: 'POST', path: '/api/v1/admin/party-union', auth: true, handle: handleCreate },
];
