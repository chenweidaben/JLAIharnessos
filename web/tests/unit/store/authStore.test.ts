/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * authStore 测试：登录 / 登出 / Token 刷新 / 权限
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { useAuthStore } from '@/store/authStore';
import { LoginError } from '@/mock/authMock';

beforeEach(() => {
  useAuthStore.getState().logout();
  window.localStorage.clear();
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
    expect(s.accessToken).toMatch(/^jt-/);
    expect(s.permissions).toContain('*');
  });

  it('验证码为空时抛出 CAPTCHA 错误', async () => {
    await expect(
      useAuthStore.getState().login({ username: 'admin', password: '123456', captcha: '' }),
    ).rejects.toThrow(LoginError);
  });

  it('不存在的账号抛出 NOT_FOUND', async () => {
    await expect(
      useAuthStore.getState().login({ username: 'ghost_user', password: '123456', captcha: 'ABCD' }),
    ).rejects.toThrow(LoginError);
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
});

describe('authStore 权限判定', () => {
  it('admin 拥有通配权限 *', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: '123456', captcha: 'ABCD' });
    expect(useAuthStore.getState().hasPermission('any:thing')).toBe(true);
  });

  it('未登录时 hasPermission 返回 false', () => {
    expect(useAuthStore.getState().hasPermission('dashboard:view')).toBe(false);
  });

  it('hasRole 支持单角色和数组', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: '123456', captcha: 'ABCD' });
    expect(useAuthStore.getState().hasRole('system_admin')).toBe(true);
    expect(useAuthStore.getState().hasRole(['nurse', 'system_admin'])).toBe(true);
    expect(useAuthStore.getState().hasRole(['nurse'])).toBe(false);
  });
});

describe('authStore 用户信息', () => {
  it('updateProfile 局部更新用户信息', async () => {
    await useAuthStore.getState().login({ username: 'admin', password: '123456', captcha: 'ABCD' });
    useAuthStore.getState().updateProfile({ realName: '陈主任' });
    expect(useAuthStore.getState().user?.realName).toBe('陈主任');
  });

  it('未登录时 updateProfile 不报错', () => {
    expect(() => useAuthStore.getState().updateProfile({ realName: 'x' })).not.toThrow();
  });
});

describe('authStore 会话恢复', () => {
  it('无持久化会话时返回 false', () => {
    expect(useAuthStore.getState().restoreSession()).toBe(false);
  });
});
