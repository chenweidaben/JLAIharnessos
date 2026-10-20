/**
 * 健澜科技 jlmedaios - M387 P1 业务扩展：多租户数据隔离深度打磨
 *
 * 租户详情/数据隔离（补缺失）
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/** GET /api/v1/tenants/detail - 租户详情 5 条 */
async function handleTenantsDetail(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TD-001', tenantName: '杭州健澜科技有限公司（总部）', scale: '500-1000 人（中大型企业）', industry: '医疗信息化（智慧医院解决方案）', address: '杭州市西湖区文三路 XXX 号', status: '已启用（正常服务）' },
    { id: 'TD-002', tenantName: '杭州健澜科技有限公司（上海分公司）', scale: '100-500 人（中型企业）', industry: '医疗信息化（智慧医院解决方案）', address: '上海市浦东新区张江高科技园区 XXX 号', status: '已启用（正常服务）' },
    { id: 'TD-003', tenantName: '杭州健澜科技有限公司（北京分公司）', scale: '100-500 人（中型企业）', industry: '医疗信息化（智慧医院解决方案）', address: '北京市海淀区中关村 XXX 号', status: '已启用（正常服务）' },
    { id: 'TD-004', tenantName: '杭州健澜科技有限公司（广州分公司）', scale: '50-100 人（小型企业）', industry: '医疗信息化（智慧医院解决方案）', address: '广州市天河区珠江新城 XXX 号', status: '已启用（正常服务）' },
    { id: 'TD-005', tenantName: '杭州健澜科技有限公司（成都分公司）', scale: '50-100 人（小型企业）', industry: '医疗信息化（智慧医院解决方案）', address: '成都市高新区天府软件园 XXX 号', status: '已启用（正常服务）' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

/** GET /api/v1/tenants/isolation - 数据隔离 5 条 */
async function handleTenantsIsolation(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;
  const items = [
    { id: 'TI-001', tenantName: '杭州健澜科技有限公司（总部）', isolationMethod: '共享数据库 + 共享表 + 租户 ID 字段隔离（Row-Level Security）', dataTable: '全部业务数据表（含 tenant_id 字段）', status: '运行正常（数据隔离有效）', description: '通过数据库行级安全策略（RLS）实现租户数据隔离，每个租户只能访问自己的数据' },
    { id: 'TI-002', tenantName: '杭州健澜科技有限公司（上海分公司）', isolationMethod: '共享数据库 + 独立 Schema（Schema 隔离）', dataTable: '独立 Schema（sh_tenant_002）', status: '运行正常（数据隔离有效）', description: '通过独立数据库 Schema 实现租户数据隔离，每个租户拥有独立的数据库对象' },
    { id: 'TI-003', tenantName: '杭州健澜科技有限公司（北京分公司）', isolationMethod: '共享数据库 + 独立 Schema（Schema 隔离）', dataTable: '独立 Schema（sh_tenant_003）', status: '运行正常（数据隔离有效）', description: '通过独立数据库 Schema 实现租户数据隔离，每个租户拥有独立的数据库对象' },
    { id: 'TI-004', tenantName: '杭州健澜科技有限公司（广州分公司）', isolationMethod: '共享数据库 + 独立 Schema（Schema 隔离）', dataTable: '独立 Schema（sh_tenant_004）', status: '运行正常（数据隔离有效）', description: '通过独立数据库 Schema 实现租户数据隔离，每个租户拥有独立的数据库对象' },
    { id: 'TI-005', tenantName: '杭州健澜科技有限公司（成都分公司）', isolationMethod: '共享数据库 + 独立 Schema（Schema 隔离）', dataTable: '独立 Schema（sh_tenant_005）', status: '运行正常（数据隔离有效）', description: '通过独立数据库 Schema 实现租户数据隔离，每个租户拥有独立的数据库对象' },
  ];
  return json(ok({ items, totalCount: items.length }));
}

export const m387Routes: RouteDef[] = [
  { method: 'GET', path: '/api/v1/tenants/detail', handle: handleTenantsDetail, auth: true },
  { method: 'GET', path: '/api/v1/tenants/isolation', handle: handleTenantsIsolation, auth: true },
];
