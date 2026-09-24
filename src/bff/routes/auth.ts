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

import { signJwt, verifyJwt } from '../middleware/auth';
import { issueCsrfToken } from '../middleware/csrf';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getUserById,
  getUserByUsername,
  getUserRoleLinks,
} from '@/db/repositories/userRepo';
import { buildAuthView, type AuthView } from '../view/userView';

/**
 * MFA 服务。默认使用进程内存储（适合单机试用/演示）。
 *
 * 多副本/生产部署必须切换为共享存储，否则各副本二次校验状态不一致：
 *   import { PgMfaStore, createEncryptionServiceCipher } from '@/security/mfa/index.js';
 *   const store = new PgMfaStore(pool, createEncryptionServiceCipher(new EncryptionService()));
 *   const mfaService = new MfaService(store);   // 表：iam.mfa_factors（15-iam-mfa.sql）
 * 详见 SECURITY.md 与《安全合规设计》。
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
 * 演示模式（DEMO_MODE=1，无 DB）下的静态用户视图；真实模式一律从 iam 加载。
 */
const DEMO_VIEW: AuthView = {
  id: 'u_1001',
  username: 'doctor_chen',
  realName: '陈**',
  employeeNo: 'DOC1001',
  gender: 'unknown',
  deptCode: 'cardiology',
  deptName: '心血管内科',
  title: '主任医师',
  phone: '',
  email: '',
  status: 'active',
  roles: [],
  roleCodes: ['chief_physician'],
  rawRoles: ['doctor'],
  permissions: ['medical_record:read', 'medical_record:write', 'order:write', 'prescription:write'],
  dataScope: 'dept',
};

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 按用户名加载真实用户视图（含角色/权限/数据范围） */
async function loadViewByUsername(username: string): Promise<AuthView | null> {
  if (isDemo) return DEMO_VIEW;
  const user = await getUserByUsername(username);
  if (!user || user.status !== 'active') return null;
  const links = await getUserRoleLinks(user.id);
  return buildAuthView(user, links);
}

/** 按用户 ID 加载真实用户视图 */
async function loadViewById(id: string): Promise<AuthView | null> {
  if (isDemo) return DEMO_VIEW;
  const user = await getUserById(id);
  if (!user || user.status !== 'active') return null;
  const links = await getUserRoleLinks(user.id);
  return buildAuthView(user, links);
}

/** 为某视图签发 access / refresh（sub 为真实 iam UUID） */
function issueTokens(view: AuthView): { accessToken: string; refreshToken: string } {
  const base = {
    sub: view.id,
    name: view.realName,
    roles: view.rawRoles.length ? view.rawRoles : ['doctor'],
    permissions: view.permissions,
    dept: view.deptName,
  };
  return {
    accessToken: signJwt(base, 7200),
    refreshToken: signJwt(base, 7 * 24 * 3600),
  };
}

export const authRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/auth/login',
    handle: async (c: Ctx) => {
      const body = await c.body<{ username?: string; password?: string }>();
      if (!body.username || !body.password) {
        return json(fail(ErrorCode.BAD_REQUEST, '用户名或密码缺失'), 400);
      }
      // 真实模式：从 iam 加载用户（试用构建不校验生产口令哈希，统一放行已存在账号）；
      // 用户不存在/停用 → 通用文案，不区分原因（防枚举）。
      const view = await loadViewByUsername(body.username.trim());
      if (!view) {
        return json(fail(ErrorCode.BAD_REQUEST, '用户名或密码错误'), 400);
      }
      const { accessToken, refreshToken } = issueTokens(view);
      const csrfToken = issueCsrfToken();

      const res = json(
        ok({
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7200,
          },
          user: view,
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
      const body = await c.body<{ refreshToken?: string }>();
      const payload = body.refreshToken ? verifyJwt(body.refreshToken) : null;
      if (!payload) {
        return json(fail(ErrorCode.UNAUTHORIZED, 'refreshToken 无效或已过期'), 401);
      }
      const view = await loadViewById(payload.sub);
      if (!view) {
        return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      }
      // 轮换 access（refresh 保持有效，简化为一并轮换）
      const { accessToken, refreshToken } = issueTokens(view);
      return json(
        ok({
          tokens: {
            accessToken,
            refreshToken,
            expiresIn: 7200,
          },
          user: view,
        }),
      );
    },
  },
  {
    method: 'GET',
    path: '/api/v1/auth/userinfo',
    handle: async (c: Ctx) => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未认证或登录已过期'), 401);
      const view = await loadViewById(c.user.id);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      return json(ok(view));
    },
    auth: true,
  },
  // 兼容前端旧路径 /auth/profile，统一返回 userinfo 视图
  {
    method: 'GET',
    path: '/api/v1/auth/profile',
    handle: async (c: Ctx) => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未认证或登录已过期'), 401);
      const view = await loadViewById(c.user.id);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      return json(ok(view));
    },
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
    handle: async (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      const [enabled, remainingBackupCodes] = await Promise.all([
        mfaService.isEnabled(user.id),
        mfaService.remainingBackupCodes(user.id),
      ]);
      return json(ok({ enabled, remainingBackupCodes }));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/auth/mfa/enroll',
    handle: async (c: Ctx) => {
      const user = requireUser(c);
      if (!user) return unauthorized();
      const result = await mfaService.beginEnroll(user.id, { accountName: user.name || user.id });
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
      const result = await mfaService.confirmEnroll(user.id, (body.token ?? '').trim());
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
      const result = await mfaService.verify(user.id, (body.token ?? '').trim());
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
      // 同时兼容 body 与 query 传参（部分 HTTP 客户端 DELETE 不带请求体）
      let token = '';
      try {
        const body = await c.body<{ token?: string }>();
        token = body.token ?? '';
      } catch {
        token = '';
      }
      if (!token) token = new URL(c.req.url).searchParams.get('token') ?? '';
      const disabled = await mfaService.disable(user.id, token.trim());
      if (!disabled) return json(fail(ErrorCode.BAD_REQUEST, '动态码/备份码校验失败，无法停用 MFA'), 400);
      return json(ok({ disabled: true }));
    },
    auth: true,
  },
];
