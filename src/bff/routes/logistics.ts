/**
 * 健澜科技 jlmedaios - 医院后勤报修 BFF 路由（M142-D + M162-D）【医院全场景】
 *
 * M142-D 报修工单闭环：
 *   POST /api/v1/logistics/request        科室/员工提交一条后勤报修
 *   GET  /api/v1/logistics/my-requests     查看「我的报修」（按创建时间倒序）
 *   PUT  /api/v1/logistics/assign/:id      后勤主管派工：登记处理人 + 预计完成时间
 *
 * M162-D 全场景后勤智能化（维修报修/被服/餐饮/保洁，派单高效不推诿）：
 *   POST /api/v1/logistics/task           一键派单：系统自动路由到责任班组
 *   GET  /api/v1/logistics/tasks?status=  全场景任务列表（可按状态过滤）
 *   GET  /api/v1/logistics/efficiency?period=today|7d|30d  效率分析看板
 *   GET  /api/v1/logistics/route          未闭环任务最近邻路线优化
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
  dispatchLogisticsTask,
  listDeepTasks,
  optimizeLogisticsRoute,
  getLogisticsEfficiency,
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

/** POST /api/v1/logistics/task：全场景一键派单，系统直派责任班组，不推诿 */
async function handleDispatchTask(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  try {
    const body = await c.body<{ taskType?: string; location?: string; description?: string }>();
    const task = dispatchLogisticsTask(
      body.taskType ?? '',
      body.location ?? '',
      body.description ?? '',
    );
    return json(ok(task, `已自动派单至${task.handlerTeam}，标准时限 ${task.etaMinutes} 分钟`), 201);
  } catch (e) {
    return json(fail(ErrorCode.BAD_REQUEST, e instanceof Error ? e.message : '派单失败'), 400);
  }
}

/** GET /api/v1/logistics/tasks?status=xxx：全场景任务列表，状态可过滤 */
async function handleListTasks(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const status = c.query.get('status') ?? '';
  const list = listDeepTasks(status);
  return json(ok({ list, total: list.length }));
}

/** GET /api/v1/logistics/efficiency?period=today|7d|30d：后勤效率看板 */
async function handleEfficiency(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const period = c.query.get('period') ?? '7d';
  return json(ok(getLogisticsEfficiency(period)));
}

/** GET /api/v1/logistics/route：未闭环任务最近邻巡线优化 */
async function handleRoute(c: Ctx): Promise<Response> {
  if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录'), 401);
  const open = listDeepTasks().filter((t) => t.status !== '已完成');
  return json(ok(optimizeLogisticsRoute(open)));
}

export const logisticsRoutes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/logistics/request', auth: true, handle: handleCreate },
  { method: 'GET', path: '/api/v1/logistics/my-requests', auth: true, handle: handleMyRequests },
  { method: 'PUT', path: '/api/v1/logistics/assign/:id', auth: true, handle: handleAssign },
  // M162-D 医院全场景后勤智能化：派单高效不推诿
  { method: 'POST', path: '/api/v1/logistics/task', auth: true, handle: handleDispatchTask },
  { method: 'GET', path: '/api/v1/logistics/tasks', auth: true, handle: handleListTasks },
  { method: 'GET', path: '/api/v1/logistics/efficiency', auth: true, handle: handleEfficiency },
  { method: 'GET', path: '/api/v1/logistics/route', auth: true, handle: handleRoute },
];
