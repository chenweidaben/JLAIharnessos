/**
 * 角色注册表与统一 RolePort 类型导出（契约 §5 roles/index.ts）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 编排器通过 buildRoleRegistry 装配四角色；角色实现统一满足 RolePort 契约。
 */

import type { SafeLlmPort } from '../llm/safeLlm';
import type { RolePort } from '../ports';
import type { RoleKind } from '../types';
import { DoctorRole } from './doctorRole';
import { ExaminerRole } from './examinerRole';
import { PharmacistRole } from './pharmacistRole';
import { SupervisorRole } from './supervisorRole';

/** 按角色标识索引的角色注册表 */
export type RoleRegistry = Map<RoleKind, RolePort>;

/** 装配四角色实例（共用同一安全 LLM 端口） */
export function buildRoleRegistry(llm: SafeLlmPort): RoleRegistry {
  return new Map<RoleKind, RolePort>([
    ['supervisor', new SupervisorRole(llm)],
    ['examiner', new ExaminerRole(llm)],
    ['doctor', new DoctorRole(llm)],
    ['pharmacist', new PharmacistRole(llm)],
  ]);
}

/** 从注册表取指定角色；未登记返回 null */
export function getRolePort(registry: RoleRegistry, kind: RoleKind): RolePort | null {
  return registry.get(kind) ?? null;
}

export type { RoleInput, RoleOutput, RolePort } from '../ports';
export { DoctorRole } from './doctorRole';
export { ExaminerRole } from './examinerRole';
export { PharmacistRole } from './pharmacistRole';
export { SupervisorRole } from './supervisorRole';
