/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * Token / 认证相关工具
 */
import { local } from './storage';
import type { AuthTokens } from '@/types/user';

const TOKEN_KEY = 'auth_tokens';

export const tokenStorage = {
  get(): AuthTokens | null {
    return local.get<AuthTokens | null>(TOKEN_KEY, null);
  },
  set(tokens: AuthTokens): void {
    local.set(TOKEN_KEY, tokens);
  },
  getAccessToken(): string {
    return this.get()?.accessToken ?? '';
  },
  getRefreshToken(): string {
    return this.get()?.refreshToken ?? '';
  },
  clear(): void {
    local.remove(TOKEN_KEY);
  },
};

export function isAuthenticated(): boolean {
  return Boolean(tokenStorage.getAccessToken());
}
