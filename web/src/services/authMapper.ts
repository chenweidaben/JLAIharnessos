/**
 * 健澜科技 jlmedaios - 登录视图映射
 *
 * 将 BFF 返回的登录用户视图（AuthView，结构对齐后端 src/bff/view/userView.ts）
 * 映射为前端 AuthUser 契约。真实模式与演示模式共用，保证字段口径一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type {
  AuthUser,
  DataScope,
  Gender,
  Role,
  RoleCode,
  UserStatus,
} from '@/types/auth';

/** BFF 登录用户视图（结构化镜像后端 AuthView，避免直接依赖后端源码类型） */
export interface AuthViewLike {
  id: string;
  username: string;
  realName: string;
  employeeNo: string;
  gender: Gender;
  deptCode: string;
  deptName: string;
  title: string;
  phone: string;
  email: string;
  status: UserStatus;
  roles: Role[];
  roleCodes: RoleCode[];
  rawRoles?: string[];
  permissions: string[];
  dataScope: DataScope;
  lastLoginAt?: string;
  createdAt?: string;
}

/** BFF /auth/login 返回体 */
export interface AuthLoginApiResponse {
  tokens: {
    accessToken: string;
    refreshToken: string;
    expiresIn: number;
  };
  user: AuthViewLike;
}

/** AuthView → AuthUser */
export function toAuthUser(view: AuthViewLike): AuthUser {
  return {
    id: view.id,
    username: view.username,
    realName: view.realName,
    employeeNo: view.employeeNo,
    gender: view.gender,
    deptCode: view.deptCode,
    deptName: view.deptName,
    title: view.title,
    phone: view.phone,
    email: view.email,
    status: view.status,
    roles: view.roles,
    roleCodes: view.roleCodes,
    permissions: view.permissions,
    dataScope: view.dataScope,
    lastLoginAt: view.lastLoginAt,
    createdAt: view.createdAt,
  };
}
