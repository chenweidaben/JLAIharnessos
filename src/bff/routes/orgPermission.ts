/**
 * 健澜科技 jlmedaios - 权限与组织架构深化（M450 DEMO_MODE=1 短路）
 * 说明：已有角色/菜单基础端点只幂等确认，本批补建科室树/岗位字典 + 数据/菜单/角色授权与审计。
 *
 * GET /api/v1/org/departments        科室树
 * GET /api/v1/org/positions          岗位字典
 * GET /api/v1/permission/user-roles   用户角色分配
 * GET /api/v1/permission/data-scope    数据权限
 * GET /api/v1/permission/menu-grants   菜单授权
 * GET /api/v1/permission/audit        权限审计
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types.js';

function items(builder: (i: number) => Record<string, unknown>, n = 5) {
  return { items: Array.from({ length: n }, (_, i) => ({ id: `op-${i + 1}`, ...builder(i + 1) })) };
}

export const orgPermM450Routes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/org/departments',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ deptNo: `DEPT-${19000 + n}`, name: `科室-${n}`, parent: `上级-${n}`, level: n, status: 'active' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/org/positions',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ positionNo: `POS-${20000 + n}`, name: `岗位-${n}`, rank: `职级-${n}`, department: `科室-${n}`, establishment: n * 3 })))),
  },
  {
    method: 'GET',
    path: '/api/v1/permission/user-roles',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ user: `用户-${n}`, role: `角色-${n}`, assigner: `分配人-${n}`, effectiveAt: new Date(Date.now() - n * 86400000).toISOString(), status: 'active' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/permission/data-scope',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ role: `角色-${n}`, scope: `数据范围-${n}`, deptSet: `科室集-${n}`, visibleLevel: `可见级别-${n}`, status: 'active' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/permission/menu-grants',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ role: `角色-${n}`, menu: `菜单-${n}`, buttonPerm: `按钮权限-${n}`, granter: `授权人-${n}`, status: 'active' })))),
  },
  {
    method: 'GET',
    path: '/api/v1/permission/audit',
    auth: false,
    handle: async (_c: Ctx): Promise<Response> => json(ok(items((n) => ({ opNo: `AUD-${21000 + n}`, user: `用户-${n}`, changeItem: `变更项-${n}`, beforeAfter: `前值→后值-${n}`, time: new Date(Date.now() - n * 3600000).toISOString() })))),
  },
];