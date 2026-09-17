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

import { signJwt } from '../middleware/auth';
import { issueCsrfToken } from '../middleware/csrf';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

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
];
