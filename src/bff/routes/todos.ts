/**
 * 健澜科技 jlmedaios - M134-D 工作台待办聚合 BFF 路由
 *
 * GET /api/v1/user/todos
 *  - 登录后按当前用户主角色（医生/护士/药师）聚合工作台待办；
 *  - 已在 BFF 侧按紧急程度排序（最重要的在最上面），前端直接顺序渲染即可；
 *  - 纯只读、无写副作用、不暴露患者个体 PII（仅聚合计数与跳转路由）。
 *
 * 用户体验深化：员工进工作台第一眼就是「今天最该做什么」，点击卡片直达业务页闭环。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import { buildTodoList, STAFF_ROLES, type Todo } from '../aggregators/todoAggregator';

/** 待办聚合视图：随响应回带角色与总数，便于前端做标题与空态。 */
interface TodoListView {
  staffId: string;
  role: string;
  total: number;
  todos: Todo[];
}

/**
 * GET /api/v1/user/todos
 * 工作台待办（医生/护士/药师），已按紧急度排序。
 */
async function handleListTodos(c: Ctx): Promise<Response> {
  try {
    const staffId = c.user?.id ?? '';
    const roles = c.user?.roles ?? [];
    // 多角色时取第一个医护角色作为主角色（与登录态角色声明一致）。
    const primaryRole =
      roles.find((r) => (STAFF_ROLES as readonly string[]).includes(r)) ?? '';

    // 未知/非医护角色返回空列表（不硬 403，保持 /user/todos 的通用性）。
    const todos = buildTodoList(staffId, primaryRole);
    const view: TodoListView = { staffId, role: primaryRole, total: todos.length, todos };
    return json(ok(view));
  } catch (err) {
    const message = err instanceof Error ? err.message : '待办加载失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const todosRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/user/todos',
    auth: true,
    handle: handleListTodos,
  },
];
