/**
 * 健澜科技 jlmedaios - 认证相关 API 测试（真实模式分支）
 * Copyright (c) 2026 健澜科技有限公司. All Rights Reserved.
 *
 * mock 掉 services/request，验证 auth API 的 URL / 入参拼装，
 * 覆盖 login/refresh/profile/logout 与 MFA 状态、注册、确认、校验、停用。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';

const post = vi.fn();
const get = vi.fn();
const del = vi.fn();

vi.mock('@/services/request', () => ({
  post: (...args: unknown[]) => post(...args),
  get: (...args: unknown[]) => get(...args),
  del: (...args: unknown[]) => del(...args),
}));

import {
  loginApi,
  refreshApi,
  fetchProfile,
  logoutApi,
  getMfaStatus,
  enrollMfa,
  confirmMfa,
  verifyMfa,
  disableMfa,
} from '@/services/api/auth';

beforeEach(() => vi.clearAllMocks());

describe('登录与会话', () => {
  it('loginApi POST /auth/login 并透传结果', async () => {
    post.mockResolvedValueOnce({ tokens: { accessToken: 'a' } });
    const payload = { username: 'doctor_chen', password: 'x' };
    const r = await loginApi(payload);
    expect(post).toHaveBeenCalledWith('/auth/login', payload);
    expect(r.tokens.accessToken).toBe('a');
  });

  it('refreshApi POST /auth/refresh', async () => {
    post.mockResolvedValueOnce({ ok: 1 });
    await refreshApi('RTK');
    expect(post).toHaveBeenCalledWith('/auth/refresh', { refreshToken: 'RTK' });
  });

  it('fetchProfile GET /auth/profile', async () => {
    get.mockResolvedValueOnce({ username: 'doctor_chen' });
    const r = await fetchProfile();
    expect(get).toHaveBeenCalledWith('/auth/profile');
    expect(r.username).toBe('doctor_chen');
  });

  it('logoutApi POST /auth/logout', async () => {
    await logoutApi();
    expect(post).toHaveBeenCalledWith('/auth/logout');
  });
});

describe('MFA 接口', () => {
  it('getMfaStatus GET /auth/mfa/status', async () => {
    get.mockResolvedValueOnce({ enabled: false, remainingBackupCodes: 0 });
    const r = await getMfaStatus();
    expect(get).toHaveBeenCalledWith('/auth/mfa/status');
    expect(r.enabled).toBe(false);
  });

  it('enrollMfa POST /auth/mfa/enroll', async () => {
    post.mockResolvedValueOnce({ secret: 'S', otpauthUri: 'otpauth://x' });
    const r = await enrollMfa();
    expect(post).toHaveBeenCalledWith('/auth/mfa/enroll', {});
    expect(r.secret).toBe('S');
  });

  it('confirmMfa POST /auth/mfa/confirm', async () => {
    post.mockResolvedValueOnce({ backupCodes: ['K7MP-2QRX'] });
    const r = await confirmMfa('123456');
    expect(post).toHaveBeenCalledWith('/auth/mfa/confirm', { token: '123456' });
    expect(r.backupCodes).toHaveLength(1);
  });

  it('verifyMfa POST /auth/mfa/verify', async () => {
    post.mockResolvedValueOnce({ method: 'totp' });
    const r = await verifyMfa('123456');
    expect(post).toHaveBeenCalledWith('/auth/mfa/verify', { token: '123456' });
    expect(r.method).toBe('totp');
  });

  it('disableMfa DEL /auth/mfa 并带 token 参数', async () => {
    del.mockResolvedValueOnce({ disabled: true });
    const r = await disableMfa('123456');
    expect(del).toHaveBeenCalledWith('/auth/mfa', { token: '123456' });
    expect(r.disabled).toBe(true);
  });
});