/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 用户 / 角色 / 权限类型
 */
import type { Gender, ID } from './common';

export type UserRole = 'admin' | 'doctor' | 'nurse' | 'viewer';

export interface Permission {
  code: string;
  name: string;
}

export interface UserInfo {
  id: ID;
  username: string;
  realName: string;
  gender: Gender;
  avatar?: string;
  deptCode: string;
  deptName: string;
  title: string;
  roles: UserRole[];
  permissions: string[];
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface LoginRequest {
  username: string;
  password: string;
  captcha?: string;
}

export interface LoginResponse {
  tokens: AuthTokens;
  user: UserInfo;
}
