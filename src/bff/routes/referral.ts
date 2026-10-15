/**
 * 健澜科技 jlmedaios - 双向转诊 BFF 路由（M143-C）【互联网医院与远程医疗】
 *
 *   POST /api/v1/referral/create        发起转诊：登记患者 / 转出转入科室 / 原因 / 预计接诊日期
 *   PUT  /api/v1/referral/:id/accept    目标科室接诊医生接收转诊（待接收 -> 已接收）
 *   GET  /api/v1/referral/incoming      转入队列：待目标科室接收的转诊单（可按 toDept 过滤）
 *
 * 仅登录用户可访问（auth: true 由框架内部处理 401）。
 * 业务内核为 referralAggregator 的纯函数，本层只做参数校验与响应封装。
 * 超期未闭环的预警由 getReferralReport 内核口径提供，不在本层另算。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  acceptReferral,
  createReferral,
  listIncoming,
} from '../aggregators/referralAggregator';

/** POST /api/v1/referral/create：发起转诊，新单默认「待接收」，方向自动识别 */
async function handleCreate(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{
      patientId?: string;
      fromDept?: string;
      toDept?: string;
      reason?: string;
      expectedDate?: string;
    }>();
    const ref = createReferral(
      body.patientId ?? '',
      body.fromDept ?? '',
      body.toDept ?? '',
      body.reason ?? '',
      body.expectedDate ?? '',
    );
    return json(ok(ref, '转诊已发起，等待目标科室接收'), 201);
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '转诊发起失败'), 400);
  }
}

/** PUT /api/v1/referral/:id/accept：接诊医生接收转诊单 */
async function handleAccept(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{ acceptingDoctor?: string }>();
    const ref = acceptReferral(c.params.id, body.acceptingDoctor ?? '');
    return json(ok(ref, '转诊已接收，开始接管诊疗'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '转诊接收失败';
    const status = msg.startsWith('转诊单不存在') ? 404 : 400;
    return json(
      fail(status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST, msg),
      status,
    );
  }
}

/** GET /api/v1/referral/incoming：转入队列（待接收，可按 toDept 过滤） */
async function handleIncoming(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const toDept = c.query.get('toDept') ?? undefined;
  const list = listIncoming(toDept);
  return json(ok({ list }));
}

export const referralRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/referral/create', auth: true, handle: handleCreate },
  { method: 'PUT', path: '/api/v1/referral/:id/accept', auth: true, handle: handleAccept },
  { method: 'GET', path: '/api/v1/referral/incoming', auth: true, handle: handleIncoming },
];
