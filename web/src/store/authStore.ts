/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 认证状态管理（Zustand）：登录态 / Token / 用户信息 / 权限 / 菜单
 * - Token 持久化：localStorage，经前端混淆（非明文）存储
 * - 自动登录：启动时检测未过期 Token 恢复登录态
 * - 登录超时：Token 过期自动登出；会话临期提醒（由 router/guards 驱动）
 * 医疗合规：密码等敏感凭证绝不写入 localStorage，仅在内存中短期使用。
 */
import { create } from 'zustand';

import { local } from '@/utils/storage';
import { tokenStorage } from '@/utils/auth';
import { useUserStore } from './userStore';
import type {
  AuthUser,
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  MenuItem,
  PersistedAuthPayload,
  PersistedIdentity,
} from '@/types/auth';
import { currentMenus, mockAccountLogin, LoginError } from '@/mock/authMock';

const STORE_KEY = 'auth_session_v2';
const DEFAULT_EXPIRE = 2 * 60 * 60 * 1000; // 2h
const REMEMBER_EXPIRE = 7 * 24 * 60 * 60 * 1000; // 7d

/* ------------------------------------------------------------------ */
/* 前端混淆（obfuscation）：XOR + Base64，仅防止明文肉眼读取            */
/* 真正的安全依赖 HTTPS 与服务端 HttpOnly Cookie，前端仅做演示封装。     */
/* ------------------------------------------------------------------ */
const SECRET = 'jianlan-hospital-2026';

function xor(str: string, key: string): string {
  let out = '';
  for (let i = 0; i < str.length; i += 1) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return out;
}

function encodeObfuscate(obj: unknown): string {
  try {
    const raw = xor(JSON.stringify(obj), SECRET);
    return window.btoa(unescape(encodeURIComponent(raw)));
  } catch {
    return '';
  }
}

function decodeObfuscate<T>(payload: string): T | null {
  try {
    const raw = decodeURIComponent(escape(window.atob(payload)));
    return JSON.parse(xor(raw, SECRET)) as T;
  } catch {
    return null;
  }
}

function persist(payload: PersistedAuthPayload | null): void {
  if (!payload) {
    local.remove(STORE_KEY);
    return;
  }
  local.set(STORE_KEY, encodeObfuscate(payload));
}

function restore(): PersistedAuthPayload | null {
  const raw = local.get<string | null>(STORE_KEY, null);
  if (!raw) return null;
  return decodeObfuscate<PersistedAuthPayload>(raw);
}

/* ------------------------------------------------------------------ */
/* 状态定义                                                            */
/* ------------------------------------------------------------------ */

export interface AuthState {
  user: AuthUser | null;
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: number;
  refreshExpiresAt: number;
  isAuthenticated: boolean;
  permissions: string[];
  roles: string[];
  menus: MenuItem[];
  loading: boolean;

  login: (req: LoginRequest) => Promise<LoginResponse>;
  logout: () => void;
  refreshAccessToken: () => Promise<boolean>;
  fetchUserInfo: () => Promise<AuthUser>;
  updateProfile: (patch: Partial<AuthUser>) => void;
  changePassword: (req: ChangePasswordRequest) => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasRole: (code: string | string[]) => boolean;
  restoreSession: () => boolean;
}

function isTokenValid(expiresAt: number): boolean {
  return expiresAt > Date.now();
}

export const useAuthStore = create<AuthState>()((set, get) => ({
  user: null,
  accessToken: '',
  refreshToken: '',
  accessExpiresAt: 0,
  refreshExpiresAt: 0,
  isAuthenticated: false,
  permissions: [],
  roles: [],
  menus: [],
  loading: false,

  /* ---------------- 登录 ---------------- */
  login: async (req: LoginRequest) => {
    set({ loading: true });
    try {
      const res = await mockAccountLogin(
        req.username,
        req.password,
        req.captcha,
        req.captchaId,
      );
      const now = Date.now();
      const ttl = req.rememberMe ? REMEMBER_EXPIRE : DEFAULT_EXPIRE;
      const accessExpiresAt = now + ttl;
      const refreshExpiresAt = now + (req.rememberMe ? REMEMBER_EXPIRE : ttl);
      const accessToken = `jt-${now}-${Math.random().toString(36).slice(2)}`;
      const refreshToken = `jr-${now}-${Math.random().toString(36).slice(2)}`;
      // 随 Token 持久化登录者本人身份快照，刷新后据其恢复，杜绝越权回退超管
      const identity: PersistedIdentity = {
        user: res.user,
        roles: res.user.roleCodes,
        permissions: res.permissions,
      };
      persist({
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
        rememberMe: req.rememberMe ?? false,
        identity,
      });
      // 桥接既有 useUserStore / tokenStorage，使旧路由守卫与顶栏用户菜单同步
      tokenStorage.set({ accessToken, refreshToken, expiresIn: Math.floor(ttl / 1000) });
      useUserStore.getState().setUser({
        id: res.user.id,
        username: res.user.username,
        realName: res.user.realName,
        gender: res.user.gender,
        avatar: res.user.avatar,
        deptCode: res.user.deptCode,
        deptName: res.user.deptName,
        title: res.user.title,
        roles: res.user.roleCodes as ('admin' | 'doctor' | 'nurse' | 'viewer')[],
        permissions: res.permissions,
      });
      set({
        user: res.user,
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
        isAuthenticated: true,
        permissions: res.permissions,
        roles: res.user.roleCodes,
        menus: res.menus,
        loading: false,
      });
      return {
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
        user: res.user,
        permissions: res.permissions,
        menus: res.menus,
      };
    } catch (e) {
      set({ loading: false });
      if (e instanceof LoginError) throw e;
      throw new LoginError('BAD_CREDENTIALS', '登录失败，请稍后重试');
    }
  },

  /* ---------------- 退出 ---------------- */
  logout: () => {
    persist(null);
    tokenStorage.clear();
    useUserStore.getState().logout();
    set({
      user: null,
      accessToken: '',
      refreshToken: '',
      accessExpiresAt: 0,
      refreshExpiresAt: 0,
      isAuthenticated: false,
      permissions: [],
      roles: [],
      menus: [],
    });
  },

  /* ---------------- 刷新 Token ---------------- */
  refreshAccessToken: async () => {
    const { refreshToken, refreshExpiresAt } = get();
    if (!refreshToken || !isTokenValid(refreshExpiresAt)) {
      get().logout();
      return false;
    }
    await new Promise((r) => setTimeout(r, 150));
    const now = Date.now();
    const accessToken = `jt-${now}-${Math.random().toString(36).slice(2)}`;
    set({ accessToken, accessExpiresAt: now + DEFAULT_EXPIRE });
    const cur = get();
    persist({
      accessToken,
      refreshToken,
      accessExpiresAt: now + DEFAULT_EXPIRE,
      refreshExpiresAt,
      rememberMe: true,
      // 刷新 Token 时保留原登录者身份，避免覆盖为无身份会话
      identity: cur.user ? { user: cur.user, roles: cur.roles, permissions: cur.permissions } : undefined,
    });
    return true;
  },

  /* ---------------- 拉取用户信息 ---------------- */
  fetchUserInfo: async () => {
    const { user } = get();
    if (user) return user;
    // 安全：无会话用户时不得静默回填内置超管身份，调用方必须先走登录流程
    await new Promise((r) => setTimeout(r, 120));
    const fresh = get().user;
    if (fresh) return fresh;
    throw new Error('登录已失效，请重新登录');
  },

  updateProfile: (patch) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, ...patch } });
  },

  changePassword: async (_req) => {
    await new Promise((r) => setTimeout(r, 400));
    // 演示：实际应由后端校验旧密码并写入新密码哈希
  },

  /* ---------------- 权限判定 ---------------- */
  hasPermission: (code) => {
    const { permissions } = get();
    return permissions.includes('*') || permissions.includes(code);
  },

  hasRole: (code) => {
    const { roles } = get();
    const list = Array.isArray(code) ? code : [code];
    return list.some((c) => roles.includes(c));
  },

  /* ---------------- 自动登录（会话恢复） ---------------- */
  restoreSession: () => {
    const saved = restore();
    if (!saved) return false;
    if (!isTokenValid(saved.refreshExpiresAt)) {
      persist(null);
      tokenStorage.clear();
      return false;
    }
    // 安全红线：必须存在登录者本人身份快照。缺失（旧会话或被篡改）时严禁回退为内置超管，
    // 直接清除会话并要求重新登录，防止低权限账号刷新页面后越权获得管理员权限。
    const identity = saved.identity;
    if (
      !identity ||
      !identity.user ||
      !Array.isArray(identity.roles) ||
      !Array.isArray(identity.permissions)
    ) {
      persist(null);
      tokenStorage.clear();
      return false;
    }
    // access token 可能已过期但 refresh 仍有效：标记为已认证，由路由守卫按需刷新
    tokenStorage.set({
      accessToken: saved.accessToken,
      refreshToken: saved.refreshToken,
      expiresIn: Math.max(0, Math.floor((saved.refreshExpiresAt - Date.now()) / 1000)),
    });
    useUserStore.getState().setUser({
      id: identity.user.id,
      username: identity.user.username,
      realName: identity.user.realName,
      gender: identity.user.gender,
      avatar: identity.user.avatar,
      deptCode: identity.user.deptCode,
      deptName: identity.user.deptName,
      title: identity.user.title,
      roles: identity.roles as ('admin' | 'doctor' | 'nurse' | 'viewer')[],
      permissions: identity.permissions,
    });
    set({
      accessToken: saved.accessToken,
      refreshToken: saved.refreshToken,
      accessExpiresAt: saved.accessExpiresAt,
      refreshExpiresAt: saved.refreshExpiresAt,
      isAuthenticated: isTokenValid(saved.accessExpiresAt) || isTokenValid(saved.refreshExpiresAt),
      user: identity.user,
      permissions: identity.permissions,
      roles: identity.roles,
      menus: currentMenus,
    });
    return true;
  },
}));
