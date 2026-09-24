/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 认证状态管理（Zustand）：登录态 / Token / 用户信息 / 权限 / 菜单
 * - 真实模式：登录打 BFF /auth/login，服务端签发真实 JWT（HS256），不再生成 jt- 伪造令牌
 * - Token 持久化：localStorage，经前端混淆（非明文）存储
 * - 自动登录：启动时检测未过期 Token 恢复登录态
 * - 登录超时：Token 过期自动登出；access 临期用 refreshToken 经 /auth/refresh 轮换
 * 医疗合规：密码等敏感凭证绝不写入 localStorage，仅在内存中短期使用。
 */
import { create } from 'zustand';

import { local } from '@/utils/storage';
import { tokenStorage } from '@/utils/auth';
import { useUserStore } from './userStore';
import { loginApi, refreshApi } from '@/services/api/auth';
import { toAuthUser } from '@/services/authMapper';
import type {
  ChangePasswordRequest,
  LoginRequest,
  LoginResponse,
  MenuItem,
  PersistedAuthPayload,
  PersistedIdentity,
} from '@/types/auth';
import { LoginError } from '@/types/auth';

const STORE_KEY = 'auth_session_v2';
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
    const b64 = decodeURIComponent(escape(window.atob(payload)));
    const json = xor(b64, SECRET);
    return JSON.parse(json) as T;
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
  user: ReturnType<typeof toAuthUser> | null;
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
  fetchUserInfo: () => Promise<ReturnType<typeof toAuthUser>>;
  updateProfile: (patch: Partial<ReturnType<typeof toAuthUser>>) => void;
  changePassword: (req: ChangePasswordRequest) => Promise<void>;
  hasPermission: (code: string) => boolean;
  hasRole: (code: string | string[]) => boolean;
  restoreSession: () => boolean;
}

function isTokenValid(expiresAt: number): boolean {
  return expiresAt > Date.now();
}

/** 桥接 useUserStore，使旧路由守卫与顶栏用户菜单同步 */
function bridgeUserStore(user: ReturnType<typeof toAuthUser>): void {
  useUserStore.getState().setUser({
    id: user.id,
    username: user.username,
    realName: user.realName,
    gender: user.gender,
    avatar: user.avatar,
    deptCode: user.deptCode,
    deptName: user.deptName,
    title: user.title,
    roles: (user.roleCodes.length ? user.roleCodes : ['doctor']) as (
      'admin' | 'doctor' | 'nurse' | 'viewer'
    )[],
    permissions: user.permissions,
  });
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

  /* ---------------- 登录（真实 BFF） ---------------- */
  login: async (req) => {
    set({ loading: true });
    try {
      const res = await loginApi({
        username: req.username,
        password: req.password,
        captcha: req.captcha,
      });
      const now = Date.now();
      const ttl = res.tokens.expiresIn * 1000;
      const accessExpiresAt = now + ttl;
      const refreshExpiresAt = now + (req.rememberMe ? REMEMBER_EXPIRE : REMEMBER_EXPIRE);
      const user = toAuthUser(res.user);
      const accessToken = res.tokens.accessToken;
      const refreshToken = res.tokens.refreshToken;

      // 随 Token 持久化登录者本人身份快照，刷新后据其恢复，杜绝越权回退超管
      const identity: PersistedIdentity = {
        user,
        roles: user.roleCodes as unknown as string[],
        permissions: user.permissions,
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
      tokenStorage.set({
        accessToken,
        refreshToken,
        expiresIn: Math.floor(ttl / 1000),
      });
      bridgeUserStore(user);

      const loginResponse: LoginResponse = {
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
        user,
        permissions: user.permissions,
        menus: [],
      };
      set({
        user,
        accessToken,
        refreshToken,
        accessExpiresAt,
        refreshExpiresAt,
        isAuthenticated: true,
        permissions: user.permissions,
        roles: user.roleCodes as unknown as string[],
        menus: [],
        loading: false,
      });
      return loginResponse;
    } catch (e) {
      set({ loading: false });
      // 统一以 LoginError 透传后端真实失败原因（如"用户名或密码错误"），不吞错误、不造假身份
      const msg = e instanceof Error ? e.message : '登录失败，请稍后重试';
      throw new LoginError('BAD_CREDENTIALS', msg);
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

  /* ---------------- 刷新 Token（真实 /auth/refresh） ---------------- */
  refreshAccessToken: async () => {
    const { refreshToken, refreshExpiresAt } = get();
    if (!refreshToken || !isTokenValid(refreshExpiresAt)) {
      get().logout();
      return false;
    }
    try {
      const res = await refreshApi(refreshToken);
      const now = Date.now();
      const accessExpiresAt = now + res.tokens.expiresIn * 1000;
      const refreshExpiresAtNew = now + REMEMBER_EXPIRE;
      const user = toAuthUser(res.user);
      const accessToken = res.tokens.accessToken;
      const newRefreshToken = res.tokens.refreshToken;

      tokenStorage.set({
        accessToken,
        refreshToken: newRefreshToken,
        expiresIn: res.tokens.expiresIn,
      });
      bridgeUserStore(user);
      persist({
        accessToken,
        refreshToken: newRefreshToken,
        accessExpiresAt,
        refreshExpiresAt: refreshExpiresAtNew,
        rememberMe: true,
        identity: {
          user,
          roles: user.roleCodes as unknown as string[],
          permissions: user.permissions,
        },
      });
      set({
        accessToken,
        refreshToken: newRefreshToken,
        accessExpiresAt,
        refreshExpiresAt: refreshExpiresAtNew,
        user,
        permissions: user.permissions,
        roles: user.roleCodes as unknown as string[],
      });
      return true;
    } catch {
      get().logout();
      return false;
    }
  },

  /* ---------------- 拉取用户信息 ---------------- */
  fetchUserInfo: async () => {
    const { user } = get();
    if (user) return user;
    // 安全：无会话用户时不得静默回填内置超管身份，调用方必须先走登录流程
    throw new LoginError('BAD_CREDENTIALS', '登录已失效，请重新登录');
  },

  updateProfile: (patch) => {
    const { user } = get();
    if (!user) return;
    set({ user: { ...user, ...patch } });
  },

  changePassword: async (_req) => {
    // 实际应由后端校验旧密码并写入新密码哈希；当前后端未开放改密接口，明确不静默成功。
    throw new Error('修改密码接口尚未开放，请联系信息科');
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
    bridgeUserStore(identity.user);
    set({
      accessToken: saved.accessToken,
      refreshToken: saved.refreshToken,
      accessExpiresAt: saved.accessExpiresAt,
      refreshExpiresAt: saved.refreshExpiresAt,
      isAuthenticated:
        isTokenValid(saved.accessExpiresAt) || isTokenValid(saved.refreshExpiresAt),
      user: identity.user,
      permissions: identity.permissions,
      roles: identity.roles,
      menus: [],
    });
    return true;
  },
}));
