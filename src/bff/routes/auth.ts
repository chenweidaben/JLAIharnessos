/**
 * 健澜科技数智医院智能体 - BFF 认证路由
 *
 * 安全要点：
 *  - 登录成功签发真实 JWT（HS256，2h 过期）
 *  - 登录失败统一返回 400，不区分"用户不存在"还是"密码错误"（防枚举）
 *  - 登录接口走限流（在 server.ts 全局限流之上可加严）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { InMemoryMfaStore, MfaService } from '@/security/mfa/index.js';

import { signJwt } from '../middleware/auth';
import { issueCsrfToken } from '../middleware/csrf';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/**
 * MFA 服务（进程内存储）。生产环境应注入基于 PostgreSQL/Redis 的 IMfaStore，
 * 并对 TOTP 密钥加密落库；多副本部署时必须使用共享存储以保证二次校验一致。
 */
const mfaService = new MfaService(new InMemoryMfaStore());

/** 路由已声明 auth:true，此处做类型收窄并兜底未认证 */
function requireUser(c: Ctx): NonNullable<Ctx['user']> | null {
  return c.user ?? null;
}

function unauthorized(): Response {
  return json(fail(ErrorCode.UNAUTHORIZED, '未认证或登录已过期'), 401);
}

/**
 * 与前端 web/src/types/user.ts 对齐的登录用户视图。
 * 生产环境应由用户中心返回完整 RBAC 信息。
 */
const VIEW_USER = {
  id: 'u_1001',
  username: 'doctor_chen',
  realName: '陈**',
  gender: 'male' as const,
  deptCode: 'internal',
  deptName: '呼吸内科',
  title: '主任医师',
  roles: ['doctor'],
  permissions: ['patient:view', 'order:write', 'chat:use'],
};

export const authRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/auth/login',
    handle: async (c: Ctx) => {
      const body = await c.body<{ username?: string; password?: string }>();
      if (!body.username || !body.password) {
        return json(fail(ErrorCode.BAD_REQUEST, '用户名或密码缺失'), 400);
      }
      // 生产环境：调用用户中心校验密码哈希（bcrypt/argon2），
      // 校验失败统一返回通用文案，不区分用户不存在/密码错误。
      const accessToken = signJwt(
        {
          sub: VIEW_USER.id,
          name: VIEW_USER.realName,
          roles: VIEW_USER.roles,
          dept: VIEW_USER.deptCode,
        },
        7200,
      );
      const refreshToken = signJwt(
        {
          sub: VIEW_USER.id,
          name: VIEW_USER.realName,
          roles: VIEW_USER.roles,
          dept: VIEW_USER.deptCode,
        },
        7 * 24 * 3600,
      );
      const csrfToken = issueCsrfToken();

      const res = json(
        ok({
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7200,
          },
          user: VIEW_USER,
        }),
      );
      // 下发 CSRF cookie（HttpOnly 否，因为前端需读取放入 X-CSRF-Token 头）
      res.headers.set('Set-Cookie', `csrf-token=${csrfToken}; Path=/; SameSite=Lax; Max-Age=7200`);
      return res;
    },
  },
  { method: 'POST', path: '/api/v1/auth/logout', handle: () => json(ok(null)), auth: true },
  {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    handle: async (c: Ctx) => {
      // 生产环境应校验 refreshToken 有效性并轮换
      await c.body<{ refreshToken?: string }>();
      const accessToken = signJwt(
        {
          sub: VIEW_USER.id,
          name: VIEW_USER.realName,
          roles: VIEW_USER.roles,
          dept: VIEW_USER.deptCode,
        },
        7200,
      );
      return json(
        ok({
          tokens: {
            accessToken,
            refreshToken: accessToken, // 演示：refresh 也轮换
            expiresIn: 7200,
          },
          user: VIEW_USER,
        }),
      );
    },
  },
  {
    method: 'GET',
    path: '/api/v1/auth/userinfo',
    handle: () => json(ok(VIEW_USER)),
    auth: true,
  },
  // 兼容前端旧路径 /auth/profile，统一重定向到 userinfo 视图
  {
    method: 'GET',
    path: '/api/v1/auth/profile',
    handle: () => json(ok(VIEW_USER)),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/auth/menus',
    handle: () =>
      json(
        ok([
          { id: 'm1', title: '工作台', path: '/dashboard', sort: 1 },
          { id: 'm2', title: '智能问诊', path: '/chat', sort: 2 },
        ]),
      ),
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/auth/permissions',
    handle: () => json(ok([{ id: 'p1', code: 'system:admin', name: '系统管理', type: 'api' }])),
    auth: true,
  },

  // ---- 多因素认证（MFA / TOTP）------------------------------------------
  {
    method: 'GET',
    path: '/api/v1/auth/mfa/status',
    handle: (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      return json(
        ok({
          enabled: mfaService.isEnabled(user.id),
          remainingBackupCodes: mfaService.remainingBackupCodes(user.id),
        }),
      );
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/auth/mfa/enroll',
    handle: async (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      const result = mfaService.beginEnroll(user.id, { accountName: user.name || user.id });
      if (!result.ok) {
        return json(fail(ErrorCode.BAD_REQUEST, `MFA 绑定发起失败: ${result.error}`), 400);
      }
      return json(ok({ secret: result.secret, otpauthUri: result.otpauthUri }));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/auth/mfa/confirm',
    handle: async (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      const body = await c.body<{ token?: string }>();
      const result = mfaService.confirmEnroll(user.id, (body.token ?? '').trim());
      if (!result.ok) {
        return json(fail(ErrorCode.BAD_REQUEST, `动态码校验失败: ${result.error}`), 400);
      }
      return json(ok({ backupCodes: result.backupCodes }));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/auth/mfa/verify',
    handle: async (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      const body = await c.body<{ token?: string }>();
      const result = mfaService.verify(user.id, (body.token ?? '').trim());
      if (!result.ok) {
        const status = result.error === 'NOT_ENABLED' ? 400 : 401;
        return json(
          fail(status === 401 ? ErrorCode.UNAUTHORIZED : ErrorCode.BAD_REQUEST, result.error),
          status,
        );
      }
      return json(ok({ method: result.method }));
    },
    auth: true,
  },
  {
    method: 'DELETE',
    path: '/api/v1/auth/mfa',
    handle: async (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      const body = await c.body<{ token?: string }>();
      const disabled = mfaService.disable(user.id, (body.token ?? '').trim());
      if (!disabled) return json(fail(ErrorCode.BAD_REQUEST, '动态码/备份码校验失败，无法停用 MFA'), 400);
      return json(ok({ disabled: true }));
    },
    auth: true,
  },
];
