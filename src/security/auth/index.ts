/**
 * 健澜科技数智医院智能体 - security/auth/index.ts
 *
 * Copyright (c) 2026 健澜科技. All rights reserved.
 */

/**
 * 健澜科技数智医院智能体 - 权限管理模块统一导出
 *
 * 版权所有 (c) 2026 健澜科技
 *
 * @module security/auth
 */

export { PermissionChecker, type PermissionCheckerConfig } from './PermissionChecker';
export {
  ACTION_DEFINITIONS,
  buildPermissionLookup,
  DATA_SCOPE_LEVEL,
  getMatrixEntry,
  hasModuleActionPermission,
  MODULE_DEFINITIONS,
  PERMISSION_MATRIX,
  type PermissionMatrixEntry,
} from './PermissionMatrix';
export {
  ASSOCIATE_CHIEF_PHYSICIAN_ROLE,
  ATTENDING_PHYSICIAN_ROLE,
  CHIEF_PHYSICIAN_ROLE,
  DEPARTMENT_HEAD_ROLE,
  getRoleDefinition,
  getRolePermissions,
  getUserPermissions,
  GUEST_ROLE,
  NURSE_ROLE,
  PATIENT_ROLE,
  PHARMACIST_ROLE,
  RESIDENT_PHYSICIAN_ROLE,
  ROLE_DEFINITIONS,
  SYSTEM_ADMIN_ROLE,
  TECHNICIAN_ROLE,
  VISITING_PHYSICIAN_ROLE,
} from './RoleDefinitions';
export { SessionManager } from './SessionManager';
