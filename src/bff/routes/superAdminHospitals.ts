/**
 * 健澜科技 jlmedaios - 超管后台「医院管理」路由（M133-B）
 *
 * 【SaaS化+智慧度】平台超级管理员专属控制台：
 *  - GET  /api/v1/superadmin/hospitals          医院列表 + 健康度 + 智慧度看板
 *  - POST /api/v1/superadmin/hospitals          新建医院租户（开通 SaaS 实例）
 *  - PUT  /api/v1/superadmin/hospitals/:id      更新医院配置 / 启停
 *
 * 安全要点（等保三级 / 医疗合规）：
 *  - 全部端点 requireRole('superadmin')：未登录 401、普通 admin/医护 一律 403；
 *    超管角色与院内 admin 严格隔离，超管不登录任何单院业务面；
 *  - 写操作经 Zod 严格校验入参；config 仅为键值对，禁存密钥；
 *  - 本路由只读/写平台级租户注册表（TenantService），不触碰任何单院业务 PII；
 *  - 通过工厂 createSuperAdminHospitalsRoutes(store) 注入租户存储，便于单测替换内存实例。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { z } from 'zod';

import { requireRole } from '../middleware/auth';
import {
  type Ctx,
  ErrorCode,
  fail,
  json,
  ok,
  type RouteDef,
} from '../types';
import { MedicalAgentError } from '../../core/errors';
import {
  type Tenant,
  type TenantService,
  tenantService,
} from '../../tenant';
import {
  buildHospitalAdminDashboard,
  type HospitalList,
  type SuperAdminHospitalRaw,
} from '../aggregators/superAdminAggregator';

/* ------------------------------------------------------------------ */
/* Zod 入参校验                                                          */
/* ------------------------------------------------------------------ */

/** 新建医院入参 */
export const createHospitalBodySchema = z.object({
  name: z.string().min(1, '医院名称不能为空').max(64, '医院名称过长'),
  /** 医院级键值配置（功能开关/业务参数；禁存密钥） */
  config: z.record(z.string(), z.unknown()).optional(),
});

/** 更新医院入参：启停 + 合并配置（至少提供一项） */
export const updateHospitalBodySchema = z
  .object({
    enabled: z.boolean().optional(),
    config: z.record(z.string(), z.unknown()).optional(),
  })
  .refine((b) => b.enabled !== undefined || b.config !== undefined, {
    message: '至少提供 enabled 或 config 之一',
  });

/* ------------------------------------------------------------------ */
/* 工具函数                                                              */
/* ------------------------------------------------------------------ */

/** 统一错误 → 响应；不可识别错误返回 null 交由调用方 500 */
function toErrorResponse(e: unknown): Response | null {
  if (e instanceof MedicalAgentError) {
    if (e.code === 'PERMISSION_DENIED') {
      return json(fail(ErrorCode.FORBIDDEN, e.message), 403);
    }
    return json(fail(ErrorCode.BAD_REQUEST, e.message), 400);
  }
  if (e instanceof z.ZodError) {
    const detail = e.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ');
    return json(fail(ErrorCode.BAD_REQUEST, `参数校验失败: ${detail}`), 400);
  }
  return null;
}

/** 把 Tenant 节点映射为聚合器入参（院区数量由存储实时统计） */
function toRaw(t: Tenant, campusCount: number): SuperAdminHospitalRaw {
  const cfg = (t.config ?? {}) as Record<string, unknown>;
  return {
    id: t.id,
    name: t.name,
    enabled: t.enabled,
    campusCount,
    userCount: typeof cfg.userCount === 'number' ? cfg.userCount : 0,
    activeUsersToday:
      typeof cfg.activeUsersToday === 'number' ? cfg.activeUsersToday : 0,
    wisdomScore: typeof cfg.wisdomScore === 'number' ? cfg.wisdomScore : 0,
    emrLevel: typeof cfg.emrLevel === 'number' ? cfg.emrLevel : 0,
    bedTotal: typeof cfg.bedTotal === 'number' ? cfg.bedTotal : 0,
    bedOccupied: typeof cfg.bedOccupied === 'number' ? cfg.bedOccupied : 0,
    ...(typeof cfg.lastActiveAt === 'string'
      ? { lastActiveAt: cfg.lastActiveAt }
      : {}),
    config: cfg,
    createdAt: t.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* 路由工厂（默认注入进程单例 tenantService；单测传入内存实例）              */
/* ------------------------------------------------------------------ */

/**
 * 构造超管医院管理路由表。
 *
 * @param store 租户注册表（默认进程单例；单测可传入 new TenantService() 做隔离）
 */
export function createSuperAdminHospitalsRoutes(
  store: TenantService = tenantService,
): RouteDef[] {
  return [
    {
      // 医院列表 + 健康度 + 智慧度看板
      method: 'GET',
      path: '/api/v1/superadmin/hospitals',
      handle: async (c: Ctx) => {
        const denied = requireRole(c, 'superadmin');
        if (denied) return denied;
        const hospitals = store.listHospitals();
        const raws = hospitals.map((h) =>
          toRaw(h, store.listCampuses(h.id).length),
        );
        const dashboard: HospitalList = buildHospitalAdminDashboard(raws);
        return json(ok(dashboard));
      },
      auth: true,
    },
    {
      // 新建医院租户（开通 SaaS 实例）
      method: 'POST',
      path: '/api/v1/superadmin/hospitals',
      handle: async (c: Ctx) => {
        const denied = requireRole(c, 'superadmin');
        if (denied) return denied;
        try {
          const body = createHospitalBodySchema.parse(await c.body());
          const node = store.createHospital(body.name, body.config ?? {});
          return json(ok(node, '医院已创建'), 201);
        } catch (e) {
          return (
            toErrorResponse(e) ??
            json(fail(ErrorCode.INTERNAL_ERROR, '创建医院失败', c.traceId), 500)
          );
        }
      },
      auth: true,
    },
    {
      // 更新医院配置 / 启停
      method: 'PUT',
      path: '/api/v1/superadmin/hospitals/:id',
      handle: async (c: Ctx) => {
        const denied = requireRole(c, 'superadmin');
        if (denied) return denied;
        try {
          const id = c.params.id;
          const body = updateHospitalBodySchema.parse(await c.body());
          let node = store.get(id);
          if (!node || node.deletedAt) {
            return json(fail(ErrorCode.NOT_FOUND, `医院不存在: ${id}`), 404);
          }
          if (body.enabled !== undefined) {
            node = store.setEnabled(id, body.enabled);
          }
          if (body.config !== undefined) {
            node = store.mergeConfig(id, body.config);
          }
          return json(ok(node, '医院配置已更新'));
        } catch (e) {
          return (
            toErrorResponse(e) ??
            json(fail(ErrorCode.INTERNAL_ERROR, '更新医院失败', c.traceId), 500)
          );
        }
      },
      auth: true,
    },
  ];
}

/** 进程级路由表（server.ts 接线使用，注入默认单例） */
export const superAdminHospitalsRoutes = createSuperAdminHospitalsRoutes();
