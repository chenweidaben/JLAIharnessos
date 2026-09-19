/**
 * 健澜科技数智医院智能体（jlmedaios）— 平台级多租户 / 一院多区领域模型
 *
 * 设计定位：
 *  - 本模块是「平台级」租户/院区上下文与数据隔离底座，与
 *    src/knowledge-platform/tenant/TenantManager（知识库四级空间 public/hospital/department/personal）
 *    解耦：前者管「哪个医院/哪个院区」，后者管「知识空间可见性」。
 *  - 层级：hospital（医院/租户）→ campus（院区）。一家医院可挂多个院区；
 *    院区数据天然归属于其医院租户。
 *  - 隔离默认开启：所有业务表必须携带 tenantId 谓词；院区场景再叠加 campusId 谓词
 *    （见 DataScopeGuard）。
 *
 * 安全红线：
 *  - 停用/软删租户立即拒绝任何解析与数据访问；
 *  - 不另起权限体系，角色仍复用 src/security/types 的 RoleCode；
 *  - 租户级 config 仅为键值对，禁止存放密钥（密钥仍走 process.env / KMS）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 * SPDX-License-Identifier: Apache-2.0
 */

import { z } from 'zod';

// ============================================================================
// 0. 标识与层级
// ============================================================================

/** 租户（医院）标识，形如 demo-hospital / h_1001 */
export type TenantId = string;

/** 院区标识，形如 main-campus / c_2001 */
export type CampusId = string;

/** 租户节点层级：hospital=医院（租户根），campus=院区（挂在医院下） */
export type TenantLevel = 'hospital' | 'campus';

// ============================================================================
// 1. 租户 / 院区节点
// ============================================================================

/**
 * 租户节点（医院或院区）。
 *
 * - level='hospital'：parentId 必须为空，代表一个独立医院租户；
 * - level='campus'：parentId 必须指向一个已存在的 hospital 节点，代表该院的一个院区。
 */
export interface Tenant {
  /** 唯一标识 */
  id: TenantId;
  /** 展示名称（医院名 / 院区名） */
  name: string;
  /** 层级 */
  level: TenantLevel;
  /** 上级租户 id；院区必填，医院留空 */
  parentId?: TenantId;
  /** 是否启用（停用后立即拒绝访问） */
  enabled: boolean;
  /** 租户级键值配置（功能开关、院区别名、业务参数等；禁止存密钥） */
  config: Record<string, unknown>;
  /** 创建时间 ISO8601 */
  createdAt: string;
  /** 最近更新时间 ISO8601 */
  updatedAt?: string;
  /** 软删除时间 ISO8601（删除后不可解析、不可见） */
  deletedAt?: string;
}

/** 医院节点（level=hospital 的语义别名，便于上层表意） */
export type Hospital = Tenant;

/** 院区节点（level=campus 的语义别名，parentId 必指向医院） */
export interface Campus extends Tenant {
  level: 'campus';
  parentId: TenantId;
}

// ============================================================================
// 2. 运行时租户上下文（一次请求内生效）
// ============================================================================

/**
 * 请求级租户上下文。由 TenantContextResolver 从 HTTP 头（X-Tenant-Id/X-Campus-Id）
 * 或 JWT 中的 tenant/campus 字段解析得到，挂到 BFF Ctx 上，供路由、工具、
 * 数据过滤（DataScopeGuard）与技能覆盖（skills registry 的 tenantId）统一使用。
 */
export interface TenantContext {
  /** 当前医院租户 id */
  tenantId: TenantId;
  /** 当前院区 id；未指定院区时为 undefined */
  campusId?: CampusId;
  /** 所在医院 id（恒等于 tenantId，冗余字段便于语义与跨层传递） */
  hospitalId: TenantId;
  /** 租户是否启用（解析阶段已保证为 true，此处保留供下游断言） */
  enabled: boolean;
  /** 合并后的租户级配置（院区配置叠加在医院配置之上，当前以医院配置为准） */
  config: Record<string, unknown>;
}

// ============================================================================
// 3. Zod 校验 Schema（管理端入参与运行时校验共用）
// ============================================================================

const CONFIG_RECORD = z.record(z.string(), z.unknown());

/** 创建租户/院区入参 */
export const createTenantSchema = z.object({
  name: z.string().min(1, '名称不能为空').max(64, '名称过长'),
  level: z.enum(['hospital', 'campus']),
  /** 院区必填，医院必须为空 */
  parentId: z.string().min(1).optional(),
  config: CONFIG_RECORD.optional(),
});
export type CreateTenantInput = z.infer<typeof createTenantSchema>;

/** 启停入参 */
export const setTenantStatusSchema = z.object({
  enabled: z.boolean(),
});
export type SetTenantStatusInput = z.infer<typeof setTenantStatusSchema>;

/** 合并租户配置入参（浅合并） */
export const mergeTenantConfigSchema = z.object({
  config: CONFIG_RECORD,
});
export type MergeTenantConfigInput = z.infer<typeof mergeTenantConfigSchema>;

/** 运行时租户节点结构校验（防御外部注入/反序列化） */
export const tenantNodeSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1),
  level: z.enum(['hospital', 'campus']),
  parentId: z.string().optional(),
  enabled: z.boolean(),
  config: CONFIG_RECORD,
  createdAt: z.string(),
  updatedAt: z.string().optional(),
  deletedAt: z.string().optional(),
});

/** 运行时上下文结构校验 */
export const tenantContextSchema = z.object({
  tenantId: z.string().min(1),
  campusId: z.string().optional(),
  hospitalId: z.string().min(1),
  enabled: z.boolean(),
  config: CONFIG_RECORD,
});

// ============================================================================
// 4. 树视图类型
// ============================================================================

/** 租户树节点（医院下挂院区列表） */
export interface TenantTreeNode {
  node: Tenant;
  /** 院区子节点（仅 hospital 节点有） */
  children: TenantTreeNode[];
}
