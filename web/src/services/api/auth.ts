/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 认证相关 API
 */
import { post, get, del } from '../request';
import { mockLogin } from '@/mock/users';
import { delay } from '@/mock/utils';
import { env } from '@/utils/config';
import type { LoginRequest, UserInfo } from '@/types/user';
import type { AuthLoginApiResponse, AuthViewLike } from '../authMapper';

/**
 * 登录结果二选一：
 *  - 正常：tokens + user，直接建立会话
 *  - mfaRequired：该用户已启用 MFA，密码正确但需第二因子，此时不发令牌，凭 challengeId 继续
 */
export type AuthLoginResult =
  | AuthLoginApiResponse
  | ({ mfaRequired: true; challengeId: string } & Partial<AuthLoginApiResponse>);

export function isMfaRequiredResult(
  r: AuthLoginResult,
): r is { mfaRequired: true; challengeId: string } {
  return Boolean((r as { mfaRequired?: boolean }).mfaRequired);
}

export async function loginApi(payload: LoginRequest): Promise<AuthLoginResult> {
  if (env.mockEnabled) {
    await delay(300, 600);
    const mock = mockLogin(payload.username);
    // 演示态 UserInfo 为窄口径，补齐 AuthViewLike 缺省字段
    const user: AuthViewLike = {
      id: String(mock.user.id),
      username: mock.user.username,
      realName: mock.user.realName,
      employeeNo: `EMP${String(mock.user.id).slice(0, 8)}`,
      gender: mock.user.gender,
      deptCode: mock.user.deptCode,
      deptName: mock.user.deptName,
      title: mock.user.title,
      phone: '',
      email: '',
      status: 'active',
      roles: [],
      roleCodes: [],
      permissions: mock.user.permissions,
      dataScope: 'dept',
    };
    return { tokens: mock.tokens, user };
  }
  return post<AuthLoginResult>('/auth/login', payload);
}

/** 登录第二因子：提交 TOTP/备份码换发会话令牌（mfaRequired 之后调用） */
export async function verifyLoginMfaApi(
  challengeId: string,
  token: string,
): Promise<AuthLoginApiResponse> {
  return post<AuthLoginApiResponse>('/auth/login/mfa', { challengeId, token });
}

/** 使用 refreshToken 轮换令牌（后端 /auth/refresh 返回与登录一致的结构） */
export async function refreshApi(refreshToken: string): Promise<AuthLoginApiResponse> {
  return post<AuthLoginApiResponse>('/auth/refresh', { refreshToken });
}

export async function fetchProfile(): Promise<UserInfo> {
  if (env.mockEnabled) {
    await delay(100, 200);
    return mockLogin('doctor_chen').user;
  }
  return get<UserInfo>('/auth/profile');
}

export async function logoutApi(): Promise<void> {
  if (env.mockEnabled) return;
  await post('/auth/logout');
}

// ---- 演示角色一键登录（P0-7 前端收尾）------------------------------------
// 后端 POST /api/v1/auth/demo-login { role } 直接签发真实 JWT，
// 返回结构比标准登录更窄（tokens 无 refreshToken；user 仅 id/name/roles/permissions）。
// 这里把它补齐成 AuthLoginApiResponse，复用 establishSession 走完整会话落地。

export type DemoRole = 'doctor' | 'nurse' | 'pharmacist' | 'admin';

/** 后端 demo-login 原始返回（窄口径，与标准登录响应不一致） */
interface DemoLoginRawResponse {
  tokens: {
    accessToken: string;
    tokenType: string;
    expiresIn: number;
    refreshToken?: string;
  };
  user: {
    id: string;
    name: string;
    roles: string[];
    permissions: string[];
  };
}

export async function demoLoginApi(role: DemoRole): Promise<AuthLoginApiResponse> {
  const res = await post<DemoLoginRawResponse>('/auth/demo-login', { role });
  return {
    tokens: {
      accessToken: res.tokens.accessToken,
      // 演示 token 不签发 refreshToken；留空串，过期后重新点角色按钮即可
      refreshToken: res.tokens.refreshToken ?? '',
      expiresIn: res.tokens.expiresIn,
    },
    user: {
      id: res.user.id,
      username: res.user.id,
      realName: res.user.name,
      employeeNo: '',
      gender: 'unknown',
      deptCode: '',
      deptName: '',
      title: '',
      phone: '',
      email: '',
      status: 'active',
      roles: [],
      roleCodes: res.user.roles as AuthLoginApiResponse['user']['roleCodes'],
      permissions: res.user.permissions,
      dataScope: 'dept',
    },
  };
}

// ---- 多因素认证（MFA / TOTP）---------------------------------------------

export interface MfaStatus {
  enabled: boolean;
  remainingBackupCodes: number;
}
export interface MfaEnroll {
  secret: string;
  otpauthUri: string;
}

/** 前端演示态的内存 MFA 状态（仅 mockEnabled 时使用，非真实 TOTP 校验） */
const mfaMockState: { enabled: boolean; backups: number } = { enabled: false, backups: 0 };

export async function getMfaStatus(): Promise<MfaStatus> {
  if (env.mockEnabled) {
    await delay(80, 160);
    return { enabled: mfaMockState.enabled, remainingBackupCodes: mfaMockState.backups };
  }
  return get<MfaStatus>('/auth/mfa/status');
}

export async function enrollMfa(): Promise<MfaEnroll> {
  if (env.mockEnabled) {
    await delay(120, 240);
    const secret = 'JBSWY3DPK5XXE3DETEST';
    return {
      secret,
      otpauthUri: `otpauth://totp/${encodeURIComponent('健澜AI原生医院操作系统OS')}:doctor_chen?secret=${secret}&issuer=${encodeURIComponent('健澜AI原生医院操作系统OS')}`,
    };
  }
  return post<MfaEnroll>('/auth/mfa/enroll', {});
}

export async function confirmMfa(token: string): Promise<{ backupCodes: string[] }> {
  if (env.mockEnabled) {
    await delay(120, 240);
    if (!/^\d{6}$/.test(token)) throw new Error('动态码应为 6 位数字');
    mfaMockState.enabled = true;
    mfaMockState.backups = 10;
    // 仅为演示态固定展示码（非真实备份码，真实码由后端一次性下发）
    const codes = [
      'K7MP-2QRX', 'N4TH-8VKB', 'W3JC-6MAD', 'P9XF-5TGE', 'R2HB-7NKQ',
      'T6VW-3JYM', 'D8SK-4PLN', 'F5ZG-9WCE', 'H2QX-6TRV', 'J9MD-3KBF',
    ];
    return { backupCodes: codes };
  }
  return post<{ backupCodes: string[] }>('/auth/mfa/confirm', { token });
}

export async function verifyMfa(token: string): Promise<{ method: string }> {
  if (env.mockEnabled) {
    await delay(80, 160);
    if (!/^\d{6}$/.test(token)) throw new Error('动态码或备份码校验失败');
    return { method: 'totp' };
  }
  return post<{ method: string }>('/auth/mfa/verify', { token });
}

export async function disableMfa(token: string): Promise<{ disabled: boolean }> {
  if (env.mockEnabled) {
    await delay(120, 240);
    if (!/^\d{6}$/.test(token) && !/^[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}-[23456789ABCDEFGHJKMNPQRSTUVWXYZ]{4}$/.test(token)) {
      throw new Error('动态码/备份码校验失败，无法停用');
    }
    mfaMockState.enabled = false;
    mfaMockState.backups = 0;
    return { disabled: true };
  }
  // del 以 query 传参，后端同时兼容 body/query
  return del<{ disabled: boolean }>('/auth/mfa', { token });
}
