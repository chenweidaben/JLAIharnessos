/**
 * 健澜科技数智医院智能体（jlmedaios）— M133-A 多医院列表路由
 *
 * 【SaaS化+智慧度】GET /api/v1/admin/hospitals
 *  - 平台管理员查看全部医院租户及其下挂院区，作为 SaaS 多院运营的主索引；
 *  - 数据源为内存租户注册表 tenantService（BFF 启动时从 iam.tenants 水合），
 *    读多写少、毫秒级返回；写操作仍走 /api/v1/admin/tenants/*。
 *
 * 安全要点（等保三级 / 医疗合规）：
 *  - 仅 requireRole('admin')，未登录 401、非管理员 403（由中间件统一拦截）；
 *  - 仅返回未软删节点；停用医院如实返回 enabled=false，供前端灰态展示；
 *  - 不返回 config 中的任何密钥（注册表本就禁止存密钥），不泄露 PII；
 *  - 只读、无写副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, json, ok, type RouteDef } from '../types';
import { tenantService } from '../../tenant';

/** GET /api/v1/admin/hospitals：全部医院 + 各医院下挂院区 */
function handleListHospitals(c: Ctx): Response {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  const hospitals = tenantService.listHospitals().map((h) => ({
    id: h.id,
    name: h.name,
    enabled: h.enabled,
    campuses: tenantService
      .listCampuses(h.id)
      .filter((cm) => !cm.deletedAt)
      .map((cm) => ({
        id: cm.id,
        name: cm.name,
        enabled: cm.enabled,
      })),
  }));

  return json(
    ok({
      defaultHospitalId: tenantService.getDefaultTenantId(),
      total: hospitals.length,
      hospitals,
    }),
  );
}

export const adminHospitalsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/hospitals',
    auth: true,
    handle: handleListHospitals,
  },
];
