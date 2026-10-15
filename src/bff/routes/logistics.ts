/**
 * 健澜科技 jlmedaios - 医院后勤报修 BFF 路由（M142-D）【预防保健与患者服务】
 *
 *   POST /api/v1/logistics/request        科室/员工提交一条后勤报修
 *   GET  /api/v1/logistics/my-requests     查看「我的报修」（按创建时间倒序）
 *   PUT  /api/v1/logistics/assign/:id      后勤主管派工：登记处理人 + 预计完成时间
 *
 * 仅登录用户可访问（c.user 内部处理 401）。
 * 业务内核为 logisticsAggregator 的纯函数，本层只做参数校验与响应封装。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, ok, fail, ErrorCode, type Ctx, type RouteDef } from '../types';
import {
  createLogisticsRequest,
  assignLogisticsTask,
  listMyRequests,
} from '../aggregators/logisticsAggregator';

/** POST /api/v1/logistics/request：提交报修，新工单默认「待派工」 */
async function handleCreate(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{ dept?: string; type?: string; description?: string }>();
    const req = createLogisticsRequest(
      c.user.id,
      body.dept ?? '',
      body.type ?? '',
      body.description ?? '',
    );
    return json(ok(req, '报修已提交，等待派工'), 201);
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '报修提交失败'), 400);
  }
}

/** GET /api/v1/logistics/my-requests：当前登录人的全部报修工单 */
async function handleMyRequests(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const list = listMyRequests(c.user.id);
  return json(ok({ list }));
}

/** PUT /api/v1/logistics/assign/:id：派工给处理人，登记预计完成时间 */
async function handleAssign(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{ handlerId?: string; eta?: string }>();
    const task = assignLogisticsTask(c.params.id, body.handlerId ?? '', body.eta ?? '');
    return json(ok(task, '派工成功，工单已进入处理队列'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : '派工失败';
    const status = msg.startsWith('工单不存在') ? 404 : 400;
    return json(fail(status === 404 ? ErrorCode.NOT_FOUND : ErrorCode.BAD_REQUEST, msg), status);
  }
}

export const logisticsRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/logistics/request', auth: true, handle: handleCreate },
  { method: 'GET', path: '/api/v1/logistics/my-requests', auth: true, handle: handleMyRequests },
  { method: 'PUT', path: '/api/v1/logistics/assign/:id', auth: true, handle: handleAssign },
];
