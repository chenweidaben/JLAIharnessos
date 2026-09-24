/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * authStore 测试：登录 / 登出 / Token 刷新 / 权限 / 会话恢复（含越权防护）
 *
 * 说明：真实架构下登录打 BFF，单测通过 vi.mock 隔离 @/services/api/auth，
 * 不发起真实网络请求，专注校验 store 的状态机与安全红线。
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { tokenStorage } from '@/utils/auth';
import { LoginError } from '@/types/auth';
import type { AuthLoginApiResponse } from '@/services/authMapper';
import type { AuthUser } from '@/types/auth';

vi.mock('@/services/api/auth', () => ({
  loginApi: vi.fn(),
  refreshApi: vi.fn(),
}));

import { loginApi, refreshApi } from '@/services/api/auth';

/* ---------------- 测试夹具 ---------------- */

function buildAdminResponse(): AuthLoginApiResponse {
  return {
    tokens: { accessToken: 'jt-admin-access', refreshToken: 'jt-admin-refresh', expiresIn: 7200 },
    user: {
      id: 'user_admin1',
      username: 'admin',
      realName: '陈维',
      employeeNo: 'A0001',
      gender: 'male',
      deptCode: 'admin',
      deptName: '信息科',
      title: '系统工程师',
      phone: '',
      email: '',
      status: 'active',
      roles: [],
      roleCodes: ['system_admin'],
      permissions: ['*'],
      dataScope: 'all',
    },
  };
}

function buildDoctorResponse(): AuthLoginApiResponse {
  return {
    tokens: { accessToken: 'jt-doc-access', refreshToken: 'jt-doc-refresh', expiresIn: 7200 },
    user: {
      id: 'user_doc1',
      username: 'doctor_chen',
      realName: '陈医生',
      employeeNo: 'D0001',
      gender: 'male',
      deptCode: 'cardio',
      deptName: '心血管内科',
      title: '主任医师',
      phone: '',
      email: '',
      status: 'active',
      roles: [],
      roleCodes: ['chief_physician'],
      permissions: ['patient:view', 'order:write', 'rx:write'],
      dataScope: 'self',
    },
  };
}

/** 内存态重置为未登录（不清 localStorage，供会话恢复测试使用） */
function resetInMemory(): void {
  useAuthStore.setState({
    user: null,
    accessToken: '',
    refreshToken: '',
    accessExpiresAt: 0,
    refreshExpiresAt: 0,
    isAuthenticated: false,
    permissions: [],
    roles: [],
  });
}

/* ---- 复刻前端混淆编码（仅用于构造会话恢复的异常夹具） ---- */
const OBF_SECRET = 'jianlan-hospital-2026';
function xor(str: string, key: string): string {
  let out = '';
  for (let i = 0; i < str.length; i += 1) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}
function encodeObfuscated(obj: unknown): string {
  const raw = xor(JSON.stringify(obj), OBF_SECRET);
  return window.btoa(unescape(encodeURIComponent(raw)));
}
function writeSession(obj: unknown): void {
  window.localStorage.setItem(
    'jianlan:auth_session_v2',
    JSON.stringify(encodeObfuscated(obj)),
  );
}

const SESSION_KEY = 'jianlan:auth_session_v2';

beforeEach(() => {
  useAuthStore.getState().logout();
  window.localStorage.clear();
  vi.mocked(loginApi).mockResolvedValue(buildAdminResponse());
  vi.mocked(refreshApi).mockResolvedValue(buildDoctorResponse());
});

describe('authStore 初始状态', () => {
  it('未登录', () => {
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.accessToken).toBe('');
    expect(s.permissions).toEqual([]);
  });
});

describe('authStore 登录', () => {
  it('admin 账号登录成功', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: '123456', captcha: 'ABCD' });
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.user?.username).toBe('admin');
    expect(s.accessToken).toBe('jt-admin-access');
    expect(s.permissions).toContain('*');
    expect(s.roles).toContain('system_admin');
  });

  it('医生账号登录获得窄口径权限（非通配）', async () => {
    vi.mocked(loginApi).mockResolvedValue(buildDoctorResponse());
    await useAuthStore
      .getState()
      .login({ username: 'doctor_chen', password: 'pw', captcha: 'ABCD' });
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(true);
    expect(s.roles).toContain('chief_physician');
    expect(s.permissions).not.toContain('*');
    expect(s.hasPermission('order:write')).toBe(true);
    expect(s.hasPermission('system:user:manage')).toBe(false);
  });

  it('后端拒绝时透传 LoginError 且不置登录态', async () => {
    vi.mocked(loginApi).mockRejectedValueOnce(new Error('用户名或密码错误'));
    await expect(
      useAuthStore.getState().login({ username: 'admin', password: 'bad', captcha: 'ABCD' }),
    ).rejects.toBeInstanceOf(LoginError);
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.loading).toBe(false);
  });

  it('登录成功后持久化为混淆态且不含密码明文', async () => {
    await useAuthStore
      .getState()
      .login({ username: 'admin', password: 'secret-pw-123', captcha: 'ABCD' });
    const raw = window.localStorage.getItem(SESSION_KEY);
    expect(raw).not.toBeNull();
    expect(raw).not.toContain('secret-pw-123');
    // 混淆值不应是可直接解析的会话 JSON
    expect(() => JSON.parse(raw as string)).not.toThrow();
  });

  it('登录成功后 tokenStorage 同步持有访问令牌', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    expect(tokenStorage.getAccessToken()).toBe('jt-admin-access');
  });
});

describe('authStore 登出', () => {
  it('登出后清空状态', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: '123456', captcha: 'ABCD' });
    useAuthStore.getState().logout();
    const s = useAuthStore.getState();
    expect(s.isAuthenticated).toBe(false);
    expect(s.user).toBeNull();
    expect(s.accessToken).toBe('');
    expect(s.permissions).toEqual([]);
  });

  it('未登录时登出不抛错', () => {
    expect(() => useAuthStore.getState().logout()).not.toThrow();
  });

  it('登出后清除持久化会话', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    expect(window.localStorage.getItem(SESSION_KEY)).not.toBeNull();
    useAuthStore.getState().logout();
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('authStore 权限判定', () => {
  it('admin 拥有通配权限 *', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    expect(useAuthStore.getState().hasPermission('any:thing')).toBe(true);
  });

  it('未登录时 hasPermission 返回 false', () => {
    expect(useAuthStore.getState().hasPermission('dashboard:view')).toBe(false);
  });

  it('hasRole 支持单角色和数组', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    expect(useAuthStore.getState().hasRole('system_admin')).toBe(true);
    expect(useAuthStore.getState().hasRole(['nurse', 'system_admin'])).toBe(true);
    expect(useAuthStore.getState().hasRole(['nurse'])).toBe(false);
  });
});

describe('authStore 用户信息', () => {
  it('updateProfile 局部更新用户信息', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    useAuthStore.getState().updateProfile({ realName: '陈主任' });
    expect(useAuthStore.getState().user?.realName).toBe('陈主任');
  });

  it('未登录时 updateProfile 不报错', () => {
    expect(() => useAuthStore.getState().updateProfile({ realName: 'x' })).not.toThrow();
  });

  it('已登录时 fetchUserInfo 返回当前用户', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    const u = await useAuthStore.getState().fetchUserInfo();
    expect(u.username).toBe('admin');
  });

  it('未登录时 fetchUserInfo 抛出 LoginError', async () => {
    await expect(useAuthStore.getState().fetchUserInfo()).rejects.toBeInstanceOf(LoginError);
  });

  it('changePassword 明确不静默成功', async () => {
    await expect(useAuthStore.getState().changePassword({} as never)).rejects.toThrow(/尚未开放/);
  });
});

describe('authStore 会话恢复', () => {
  it('无持久化会话时返回 false', () => {
    expect(useAuthStore.getState().restoreSession()).toBe(false);
  });

  it('损坏/篡改的原始值返回 false', () => {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify('!!!not-a-valid-b64!!!'));
    expect(useAuthStore.getState().restoreSession()).toBe(false);
  });

  it('登录后内存态丢失可据持久化恢复', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    resetInMemory();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
    expect(useAuthStore.getState().restoreSession()).toBe(true);
    expect(useAuthStore.getState().user?.username).toBe('admin');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('安全红线：缺少身份快照的会话拒绝恢复（防越权）', () => {
    writeSession({
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAt: Date.now() + 3_600_000,
      refreshExpiresAt: Date.now() + 86_400_000,
    });
    expect(useAuthStore.getState().restoreSession()).toBe(false);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refresh 已过期的会话拒绝恢复并清除', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    const user = useAuthStore.getState().user as AuthUser;
    useAuthStore.getState().logout();
    writeSession({
      accessToken: 'a',
      refreshToken: 'r',
      accessExpiresAt: Date.now() - 2_000,
      refreshExpiresAt: Date.now() - 1_000,
      identity: { user, roles: user.roleCodes, permissions: user.permissions },
    });
    expect(useAuthStore.getState().restoreSession()).toBe(false);
    expect(window.localStorage.getItem(SESSION_KEY)).toBeNull();
  });
});

describe('authStore Token 刷新', () => {
  it('无 refreshToken 时返回 false 并登出', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    useAuthStore.setState({ refreshToken: '', refreshExpiresAt: Date.now() + 10_000 });
    expect(await useAuthStore.getState().refreshAccessToken()).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });

  it('refreshApi 成功时轮换令牌并返回 true', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    vi.mocked(refreshApi).mockResolvedValue(buildDoctorResponse());
    expect(await useAuthStore.getState().refreshAccessToken()).toBe(true);
    expect(useAuthStore.getState().accessToken).toBe('jt-doc-access');
    expect(useAuthStore.getState().isAuthenticated).toBe(true);
  });

  it('refreshApi 失败时返回 false 并登出', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: 'x', captcha: 'ABCD' });
    vi.mocked(refreshApi).mockRejectedValueOnce(new Error('invalid refresh token'));
    expect(await useAuthStore.getState().refreshAccessToken()).toBe(false);
    expect(useAuthStore.getState().isAuthenticated).toBe(false);
  });
});
