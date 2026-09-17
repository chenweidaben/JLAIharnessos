/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * auth Token 管理测试
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { tokenStorage, isAuthenticated } from '@/utils/auth';
import { local } from '@/utils/storage';

beforeEach(() => {
  window.localStorage.clear();
});

describe('tokenStorage', () => {
  it('初始无 Token', () => {
    expect(tokenStorage.get()).toBeNull();
    expect(tokenStorage.getAccessToken()).toBe('');
    expect(tokenStorage.getRefreshToken()).toBe('');
  });

  it('set 后可读写 accessToken / refreshToken', () => {
    tokenStorage.set({ accessToken: 'jt-abc', refreshToken: 'jr-def', expiresIn: 7200 });
    expect(tokenStorage.getAccessToken()).toBe('jt-abc');
    expect(tokenStorage.getRefreshToken()).toBe('jr-def');
  });

  it('clear 后清空 Token', () => {
    tokenStorage.set({ accessToken: 'jt-abc', refreshToken: 'jr-def', expiresIn: 7200 });
    tokenStorage.clear();
    expect(tokenStorage.getAccessToken()).toBe('');
    expect(tokenStorage.getRefreshToken()).toBe('');
  });

  it('Token 持久化到 localStorage（命名空间下）', () => {
    tokenStorage.set({ accessToken: 'jt-persist', refreshToken: 'jr-persist', expiresIn: 7200 });
    const raw = window.localStorage.getItem('jianlan:auth_tokens');
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!).accessToken).toBe('jt-persist');
  });
});

describe('isAuthenticated', () => {
  it('无 Token 时返回 false', () => {
    expect(isAuthenticated()).toBe(false);
  });

  it('有 accessToken 时返回 true', () => {
    tokenStorage.set({ accessToken: 'jt-valid', refreshToken: 'jr-valid', expiresIn: 7200 });
    expect(isAuthenticated()).toBe(true);
  });

  it('local 存储被清空后返回 false', () => {
    tokenStorage.set({ accessToken: 'jt-x', refreshToken: 'jr-x', expiresIn: 7200 });
    local.remove('auth_tokens');
    expect(isAuthenticated()).toBe(false);
  });
});
