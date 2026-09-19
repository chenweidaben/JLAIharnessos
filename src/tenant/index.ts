/**
 * 健澜科技数智医院智能体（jlmedaios）— 平台级多租户 / 一院多区统一出口
 *
 * 用法：
 *  ```ts
 *  import {
 *    tenantService, tenantContextResolver, dataScopeGuard,
 *    type TenantContext, type Tenant,
 *  } from '../tenant';
 *  ```
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

export type {
  Campus,
  CreateTenantInput,
  Hospital,
  MergeTenantConfigInput,
  SetTenantStatusInput,
  Tenant,
  TenantContext,
  TenantId,
  CampusId,
  TenantLevel,
  TenantTreeNode,
} from './types';
export {
  createTenantSchema,
  mergeTenantConfigSchema,
  setTenantStatusSchema,
  tenantContextSchema,
  tenantNodeSchema,
} from './types';

export {
  TenantService,
  TenantErrorCodes,
  tenantService,
  type TenantServiceOptions,
} from './TenantService';

export {
  TenantContextResolver,
  tenantContextResolver,
  type TenantContextResolverOptions,
  type TenantResolveInput,
} from './TenantContextResolver';

export {
  DataScopeGuard,
  dataScopeGuard,
  type DataScopePredicate,
  type TenantScopedRow,
} from './DataScopeGuard';
