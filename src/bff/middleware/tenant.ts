/**
 * 健澜科技数智医院智能体（jlmedaios）— BFF 租户上下文中间件
 *
 * 职责：
 *  - 在鉴权（attachUser/requireAuth）之后，从请求解析当前租户/院区上下文；
 *  - 成功则把 TenantContext 挂到 Ctx（经 WeakMap，不改动既有 Ctx 结构）；
 *  - 失败（未知/停用/越权院区）返回 403；
 *  - 多租户关闭时自动回退默认租户，对业务透明。
 *
 * 接线说明：
 *  - 本文件只导出 tenantContextMiddleware 与 getTenantContext；
 *  - 由装配方在 server.ts 鉴权之后、业务路由之前调用（本阶段不自行改 server.ts）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalAgentError } from '../../core/errors';
import { tenantContextResolver, type TenantContext } from '../../tenant';
import { type Ctx, ErrorCode, fail, json } from '../types';

/**
 * Ctx → TenantContext 的弱引用映射。
 * 用 WeakMap 而非改 Ctx 接口：零侵入、不破坏既有路由，请求结束即可被 GC。
 */
const ctxTenantMap = new WeakMap<Ctx, TenantContext>();

/** 取当前请求的租户上下文（中间件执行后才有；未执行为 undefined） */
export function getTenantContext(ctx: Ctx): TenantContext | undefined {
  return ctxTenantMap.get(ctx);
}

/**
 * 租户上下文中间件。
 * @returns null 表示成功（已挂到 ctx）；返回 Response 表示应直接短路响应（403/500）。
 */
export function tenantContextMiddleware(ctx: Ctx): Response | null {
  try {
    const resolved = tenantContextResolver.resolveFromRequest(ctx.req);
    ctxTenantMap.set(ctx, resolved);
    return null;
  } catch (e) {
    if (e instanceof MedicalAgentError) {
      // 未知/停用/越权院区 → 403（不暴露租户是否存在的细节，统一文案）
      return json(
        fail(ErrorCode.FORBIDDEN, `租户上下文不可用: ${e.message}`, ctx.traceId),
        403,
      );
    }
    return json(
      fail(ErrorCode.INTERNAL_ERROR, '租户上下文解析失败', ctx.traceId),
      500,
    );
  }
}
