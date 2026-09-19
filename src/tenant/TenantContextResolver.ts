/**
 * 健澜科技数智医院智能体（jlmedaios）— 租户上下文解析器
 *
 * 解析来源（优先级从高到低）：
 *  1. 显式 HTTP 头：X-Tenant-Id / X-Campus-Id（网关/前端显式指定院区）；
 *  2. JWT 中的 tenant / campus 声明（用户中心下发的登录态归属院区）；
 *  3. 均未提供时回退到默认租户（DEFAULT_TENANT_ID / DEFAULT_CAMPUS_ID）。
 *
 * 行为：
 *  - MULTI_TENANT_ENABLED=false 时，无论请求头如何都强制回退默认租户（单院部署模式）；
 *  - 启用时，未知/停用/已删除租户立即抛 MedicalAgentError（中间件转 403）；
 *  - 指定院区时校验其确实挂在指定医院下，否则抛错（防越权跨院区）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { MedicalAgentError } from '../core/errors';
import type { TenantContext } from './types';
import { tenantService, TenantErrorCodes, type TenantService } from './TenantService';

/** 解析器可接受的原始输入（头/JWT/测试直传均可） */
export interface TenantResolveInput {
  tenantId?: string | null;
  campusId?: string | null;
}

/** 构造选项 */
export interface TenantContextResolverOptions {
  /** 多租户开关；缺省读 env MULTI_TENANT_ENABLED（默认 true） */
  multiTenantEnabled?: boolean;
  /** 默认租户 id（缺省读 TenantService 单例的默认值） */
  defaultTenantId?: string;
  /** 默认院区 id */
  defaultCampusId?: string;
}

export class TenantContextResolver {
  private readonly service: TenantService;
  private readonly multiTenantEnabled: boolean;
  private readonly defaultTenantId: string;
  private readonly defaultCampusId: string;

  constructor(service: TenantService, opts: TenantContextResolverOptions = {}) {
    this.service = service;
    const envFlag = (process.env.MULTI_TENANT_ENABLED ?? 'true').toLowerCase();
    this.multiTenantEnabled =
      opts.multiTenantEnabled ?? (envFlag === 'true' || envFlag === '1' || envFlag === 'yes');
    this.defaultTenantId = opts.defaultTenantId ?? service.getDefaultTenantId();
    this.defaultCampusId = opts.defaultCampusId ?? service.getDefaultCampusId();
  }

  /** 多租户是否开启（供中间件/日志判断） */
  isMultiTenantEnabled(): boolean {
    return this.multiTenantEnabled;
  }

  /** 从任意输入解析出运行时上下文（核心纯逻辑） */
  resolve(input: TenantResolveInput): TenantContext {
    // 单院模式：忽略一切指定，强制默认租户
    if (!this.multiTenantEnabled) {
      return this.buildDefault();
    }

    const tenantId = input.tenantId?.trim() || this.defaultTenantId;
    const tenant = this.service.resolveActive(tenantId);

    // 院区：优先请求指定，其次默认院区；两者皆空则不绑定院区（全院区视图）
    let campusId: string | undefined = input.campusId?.trim() || this.defaultCampusId;
    if (campusId) {
      const campus = this.service.resolveActive(campusId);
      if (campus.level !== 'campus') {
        throw new MedicalAgentError(
          TenantErrorCodes.TENANT_NOT_FOUND,
          `指定的 campusId 不是院区: ${campusId}`,
        );
      }
      if (campus.parentId !== tenant.id) {
        throw new MedicalAgentError(
          TenantErrorCodes.CAMPUS_NOT_UNDER_HOSPITAL,
          `院区 ${campusId} 不属于医院 ${tenant.id}`,
        );
      }
    } else {
      campusId = undefined;
    }

    return this.buildContext(tenant.id, campusId, tenant.config);
  }

  /** 从 Web Request 解析（读 X-Tenant-Id / X-Campus-Id 头） */
  resolveFromRequest(req: Request): TenantContext {
    return this.resolve({
      tenantId: req.headers.get('X-Tenant-Id'),
      campusId: req.headers.get('X-Campus-Id'),
    });
  }

  /** 从 Headers 对象解析（便于在非 Request 场景复用） */
  resolveFromHeaders(headers: Headers): TenantContext {
    return this.resolve({
      tenantId: headers.get('X-Tenant-Id'),
      campusId: headers.get('X-Campus-Id'),
    });
  }

  // ------------------------------------------------------------------
  // 内部
  // ------------------------------------------------------------------

  private buildDefault(): TenantContext {
    const tenant = this.service.resolveActive(this.defaultTenantId);
    return this.buildContext(tenant.id, this.defaultCampusId || undefined, tenant.config);
  }

  private buildContext(
    tenantId: string,
    campusId: string | undefined,
    config: Record<string, unknown>,
  ): TenantContext {
    return {
      tenantId,
      campusId,
      hospitalId: tenantId,
      enabled: true,
      config,
    };
  }
}

/** 进程级单例 */
export const tenantContextResolver = new TenantContextResolver(tenantService);
