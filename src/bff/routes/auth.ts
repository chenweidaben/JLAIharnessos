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

import { newJti, signJwt, verifyJwt } from '../middleware/auth';
import { issueCsrfToken } from '../middleware/csrf';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  getUserById,
  getUserByUsername,
  getUserRoleLinks,
} from '@/db/repositories/userRepo';
import {
  createSession,
  getActiveByRefreshJti,
  revokeByJti,
  revokeByRefreshJti,
} from '@/db/repositories/sessionRepo';
import { markSessionRevoked } from '../middleware/sessionGuard';
import { buildAuthView, type AuthView } from '../view/userView';
import { getMfaService } from '../mfaRuntime.js';
import { issueLoginChallenge } from '../aggregators/mfaAggregator.js';

/**
 * MFA 服务单例（见 ../mfaRuntime）：真实模式持久化到 iam.mfa_factors，
 * 演示模式回退进程内存储。此处不再在模块加载时构造，避免无 DB 环境启动即崩。
 */

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

/** 提取登录终端信息（IP 取代理转发头，UA 截断存储）。 */
function requestEndpoint(c: Ctx): { ip: string | null; userAgent: string | null } {
  const fwd = c.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ua = c.req.headers.get('user-agent') ?? '';
  return {
    ip: fwd || null,
    userAgent: ua ? ua.slice(0, 256) : null,
  };
}

/** 登录/MFA 成功后登记会话（演示模式无库，跳过）。导出供 MFA 登录复用。 */
export async function registerSession(
  c: Ctx,
  view: AuthView,
  tokens: IssuedTokens,
): Promise<void> {
  if (isDemo) return;
  const { ip, userAgent } = requestEndpoint(c);
  await createSession({
    jti: tokens.accessJti,
    refreshJti: tokens.refreshJti,
    userId: view.id,
    accessExpiresAt: tokens.accessExpiresAt,
    refreshExpiresAt: tokens.refreshExpiresAt,
    ip,
    userAgent,
  });
}

/** 按用户名加载真实用户视图（含角色/权限/数据范围） */
async function loadViewByUsername(username: string): Promise<AuthView | null> {
  if (isDemo) return DEMO_VIEW;
  const user = await getUserByUsername(username);
  if (!user || user.status !== 'active') return null;
  const links = await getUserRoleLinks(user.id);
  return buildAuthView(user, links);
}

/** 按用户 ID 加载真实用户视图（导出供 MFA 登录二发令牌使用） */
export async function loadViewById(id: string): Promise<AuthView | null> {
  if (isDemo) return DEMO_VIEW;
  const user = await getUserById(id);
  if (!user || user.status !== 'active') return null;
  const links = await getUserRoleLinks(user.id);
  return buildAuthView(user, links);
}

/** 一次签发的令牌与配套会话信息（jti/过期时间用于登记会话） */
export interface IssuedTokens {
  accessToken: string;
  refreshToken: string;
  accessJti: string;
  refreshJti: string;
  accessExpiresAt: Date;
  refreshExpiresAt: Date;
}

/**
 * 为某视图签发 access / refresh（sub 为真实 iam UUID）；
 * 同时生成 jti 与过期时间，供登录后登记会话。导出供 MFA 登录二发令牌。
 */
export function issueTokens(view: AuthView): IssuedTokens {
  const now = Date.now();
  const accessJti = newJti();
  const refreshJti = newJti();
  const base = {
    sub: view.id,
    name: view.realName,
    roles: view.rawRoles.length ? view.rawRoles : ['doctor'],
    permissions: view.permissions,
    dept: view.deptName,
  };
  return {
    accessToken: signJwt({ ...base, jti: accessJti }, 7200),
    refreshToken: signJwt({ ...base, jti: refreshJti }, 7 * 24 * 3600),
    accessJti,
    refreshJti,
    accessExpiresAt: new Date(now + 7200 * 1000),
    refreshExpiresAt: new Date(now + 7 * 24 * 3600 * 1000),
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

      // M3-C：若用户已启用 MFA，密码通过后不直接发令牌，改发第二因子挑战。
      // 客户端凭 challengeId 调 POST /api/v1/auth/login/mfa 提交 TOTP/备份码后才换发令牌。
      if (!isDemo && (await getMfaService().isEnabled(view.id))) {
        const challenge = await issueLoginChallenge(view.id);
        return json(ok({ mfaRequired: true, challengeId: challenge.challengeId }));
      }

      const tokens = issueTokens(view);
      await registerSession(c, view, tokens);
      const csrfToken = issueCsrfToken();

      const res = json(
        ok({
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
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
  {
    method: 'POST',
    path: '/api/v1/auth/logout',
    handle: async (c: Ctx) => {
      // 主动登出：吊销当前访问令牌会话，使令牌立即失效
      const user = c.user;
      if (user?.jti) {
        await revokeByJti(user.jti, 'logout');
        markSessionRevoked(user.jti);
      }
      return json(ok(null));
    },
    auth: true,
  },
  {
    method: 'POST',
    path: '/api/v1/auth/refresh',
    handle: async (c: Ctx) => {
      const body = await c.body<{ refreshToken?: string }>();
      const payload = body.refreshToken ? verifyJwt(body.refreshToken) : null;
      if (!payload || !payload.jti) {
        return json(fail(ErrorCode.UNAUTHORIZED, 'refreshToken 无效或已过期'), 401);
      }
      // 校验 refresh 会话是否仍有效（登出/轮换后旧 refresh 被吊销）
      let prevAccessJti: string | null = null;
      if (!isDemo) {
        const refreshSession = await getActiveByRefreshJti(payload.jti);
        if (!refreshSession) {
          return json(fail(ErrorCode.UNAUTHORIZED, 'refreshToken 已失效，请重新登录'), 401);
        }
        prevAccessJti = refreshSession.jti;
      }
      const view = await loadViewById(payload.sub);
      if (!view) {
        return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      }
      // 刷新轮换：吊销旧会话，签发并登记新会话
      const tokens = issueTokens(view);
      if (!isDemo) {
        await revokeByRefreshJti(payload.jti, 'refresh_rotation');
        // 旧 access 令牌同步标记失效（同一会话行已吊销，缓存立即失效）
        if (prevAccessJti) markSessionRevoked(prevAccessJti);
        await registerSession(c, view, tokens);
      }
      return json(
        ok({
          tokens: {
            accessToken: tokens.accessToken,
            refreshToken: tokens.refreshToken,
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
        getMfaService().isEnabled(user.id),
        getMfaService().remainingBackupCodes(user.id),
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
      const result = await getMfaService().beginEnroll(user.id, { accountName: user.name || user.id });
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
      const result = await getMfaService().confirmEnroll(user.id, (body.token ?? '').trim());
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
      const result = await getMfaService().verify(user.id, (body.token ?? '').trim());
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
      const disabled = await getMfaService().disable(user.id, token.trim());
      if (!disabled) return json(fail(ErrorCode.BAD_REQUEST, '动态码/备份码校验失败，无法停用 MFA'), 400);
      return json(ok({ disabled: true }));
    },
    auth: true,
  },
];
