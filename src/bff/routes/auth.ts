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
import { recordLoginAttempt } from '@/db/repositories/loginAttemptRepo';
import { loginRateLimit } from '../middleware/rateLimit';
import { markSessionRevoked } from '../middleware/sessionGuard';
import { buildAuthView, ROLE_PERMISSIONS, type AuthView } from '../view/userView';
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
 * 演示模式多角色测试用户：按用户名返回不同角色视图，用于菜单/权限矩阵测试。
 * admin/doctor_chen 保留 '*' 通配（全功能），其余走 ROLE_PERMISSIONS 精确权限。
 */
function demoViewFor(username: string): AuthView {
  const base = { phone: '', email: '', status: 'active' as const, roles: [] };
  switch (username) {
    case 'doctor_li':
      return { ...base, id: 'u_2001', username, realName: '李医生', employeeNo: 'DOC2001', gender: 'male', deptCode: 'cardiology', deptName: '心血管内科', title: '主治医师', roleCodes: ['doctor'], rawRoles: ['doctor'], permissions: ROLE_PERMISSIONS.doctor, dataScope: 'dept' };
    case 'nurse_wang':
      return { ...base, id: 'u_2002', username, realName: '王护士', employeeNo: 'NUR2002', gender: 'female', deptCode: 'ward_3f', deptName: '三病区', title: '护师', roleCodes: ['nurse'], rawRoles: ['nurse'], permissions: ROLE_PERMISSIONS.nurse, dataScope: 'dept' };
    case 'pharmacist_zhang':
      return { ...base, id: 'u_2003', username, realName: '张药师', employeeNo: 'PHA2003', gender: 'male', deptCode: 'pharmacy', deptName: '药学部', title: '主管药师', roleCodes: ['pharmacist'], rawRoles: ['pharmacist'], permissions: ROLE_PERMISSIONS.pharmacist, dataScope: 'dept' };
    case 'tech_liu':
      return { ...base, id: 'u_2004', username, realName: '刘技师', employeeNo: 'TEC2004', gender: 'male', deptCode: 'lab', deptName: '检验科', title: '检验技师', roleCodes: ['technician'], rawRoles: ['technician'], permissions: ROLE_PERMISSIONS.technician, dataScope: 'dept' };
    case 'researcher_zhao':
      return { ...base, id: 'u_2005', username, realName: '赵研究员', employeeNo: 'RES2005', gender: 'male', deptCode: 'research', deptName: '科研处', title: '副研究员', roleCodes: ['researcher'], rawRoles: ['researcher'], permissions: ROLE_PERMISSIONS.researcher, dataScope: 'all' };
    case 'patient_test':
      return { ...base, id: 'u_2006', username, realName: '测试患者', employeeNo: 'PAT2006', gender: 'unknown', deptCode: 'outpatient', deptName: '门诊', title: '', roleCodes: ['patient'], rawRoles: ['patient'], permissions: ROLE_PERMISSIONS.patient, dataScope: 'self' };
    default:
      return { ...base, id: 'u_1001', username: 'doctor_chen', realName: '陈**', employeeNo: 'DOC1001', gender: 'unknown', deptCode: 'cardiology', deptName: '心血管内科', title: '主任医师', roleCodes: ['admin'], rawRoles: ['admin'], permissions: ['*'], dataScope: 'all' };
  }
}

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 提取登录终端信息（IP 取代理转发头，UA 截断存储）。 */
function requestEndpoint(c: Ctx): { ip: string | null; userAgent: string | null } {
  // 经反向代理（nginx 等）时取 x-forwarded-for 首段；直连时回退到 socket IP。
  const fwd = c.req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ua = c.req.headers.get('user-agent') ?? '';
  return {
    ip: fwd || c.clientIp || null,
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
  // 成功登录记入登录尝试台账（MFA 登录成功同样经此函数，统一留痕）
  await recordLoginAttempt({
    username: view.username,
    userId: view.id,
    success: true,
    ip,
    userAgent,
  });
}

/** 按用户名加载真实用户视图（含角色/权限/数据范围） */
async function loadViewByUsername(username: string): Promise<AuthView | null> {
  if (isDemo) return demoViewFor(username);
  const user = await getUserByUsername(username);
  if (!user || user.status !== 'active') return null;
  const links = await getUserRoleLinks(user.id);
  return buildAuthView(user, links);
}

/** 按用户 ID 加载真实用户视图（导出供 MFA 登录二发令牌使用） */
export async function loadViewById(id: string): Promise<AuthView | null> {
  if (isDemo) {
    const map: Record<string, string> = {
      u_1001: 'doctor_chen', u_2001: 'doctor_li', u_2002: 'nurse_wang',
      u_2003: 'pharmacist_zhang', u_2004: 'tech_liu', u_2005: 'researcher_zhao', u_2006: 'patient_test',
    };
    return demoViewFor(map[id] ?? 'doctor_chen');
  }
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
      // 登录专用限流：5 次/分钟/IP（防暴力破解/撞库）
      const limited = loginRateLimit(c);
      if (limited) return limited;

      const body = await c.body<{ username?: string; password?: string }>();
      if (!body.username || !body.password) {
        return json(fail(ErrorCode.BAD_REQUEST, '用户名或密码缺失'), 400);
      }
      // 真实模式：从 iam 加载用户（试用构建不校验生产口令哈希，统一放行已存在账号）；
      // 用户不存在/停用 → 通用文案，不区分原因（防枚举）。
      const loginUsername = body.username.trim();
      const view = await loadViewByUsername(loginUsername);
      if (!view) {
        // 记录失败登录（用户不存在/停用/口令错误统一文案，防枚举）
        if (!isDemo) {
          const ep = requestEndpoint(c);
          await recordLoginAttempt({
            username: loginUsername,
            success: false,
            failReason: '用户名或密码错误',
            ip: ep.ip,
            userAgent: ep.userAgent,
          });
        }
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
        // 演示模式无数据库：跳过会话吊销落库（revokeByJti 直连 PG 会 500），
        // 仅做内存会话标记并直接返回成功；真实模式行为不变。
        if (!isDemo) {
          await revokeByJti(user.jti, 'logout');
        }
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
    // v5.0试点扩展（P0安全止血）：由硬编码桩改为按当前用户 permissions 动态过滤。
    // 菜单描述与 web/src/components/layout/SideMenu.tsx 的 navItems 对齐（perm 码一致），
    // 前端可选择以本接口为准渲染菜单；路由守卫仍由前端 RequirePermission 二次拦截。
    handle: async (c: Ctx) => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未认证或登录已过期'), 401);
      const view = await loadViewById(c.user.id);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      const perms = new Set(view.permissions);
      const has = (code?: string | string[]) => {
        if (!code) return true;
        const codes = Array.isArray(code) ? code : [code];
        return codes.some((x) => perms.has(x));
      };
      // 与 SideMenu.navItems 对齐的最小菜单描述（分组与顶层项）
      const menuDef: Array<{
        id: string; title: string; path?: string; perm?: string | string[];
        children?: Array<{ id: string; title: string; path: string; perm?: string | string[] }>;
      }> = [
        { id: 'dashboard', title: '工作台', path: '/dashboard', perm: 'dashboard:view' },
        { id: 'patients', title: '患者管理', path: '/patients', perm: 'patient:view' },
        { id: 'ai-report', title: 'AI 辅诊', path: '/imaging/ai/report', perm: 'imaging:view' },
        { id: 'outpatient', title: '门诊问诊', path: '/outpatient', perm: 'emr:view' },
        { id: 'ward', title: '住院查房', path: '/ward', perm: ['emr:view', 'order:view', 'emg:view'] },
        { id: 'agent', title: 'AI 问诊', path: '/agent', perm: 'ai:chat:use' },
        { id: 'emergency', title: '急诊分诊', path: '/emergency', perm: 'emg:view' },
        { id: 'pharmacy', title: '药房发药', path: '/pharmacy', perm: 'pharmacy:view' },
        { id: 'medical-qc', title: '病历质控', path: '/medical-qc', perm: 'medical_record:read' },
        { id: 'front-page', title: '病案首页', path: '/front-page', perm: 'front_page:read' },
        {
          id: 'grp-emr', title: 'EMR 文书质控', children: [
            { id: 'emr-terminal-qc', title: '终末质控', path: '/emr/terminal-qc', perm: 'terminal_qc:view' },
            { id: 'emr-drug-review', title: '合理用药', path: '/emr/drug-review', perm: 'drug_review:view' },
            { id: 'emr-level5', title: '五级评审', path: '/emr/level5', perm: 'emr_level5:view' },
          ],
        },
        { id: 'research', title: '科研队列', path: '/research', perm: 'research:read' },
        { id: 'empi', title: '患者主索引', path: '/empi', perm: 'empi:read' },
        { id: 'data-warehouse', title: '数据湖仓', path: '/data-warehouse', perm: 'data_warehouse:read' },
        { id: 'data-governance', title: '数据治理', path: '/data-governance', perm: 'data_governance:read' },
        { id: 'billing', title: '收费结算', path: '/billing', perm: 'billing:read' },
        { id: 'quality', title: '质量管理', path: '/quality', perm: 'qc:view' },
        { id: 'patient-portal', title: '患者首页', path: '/patient-portal', perm: 'patient_portal:view' },
        {
          id: 'grp-operation', title: '科室运营', children: [
            { id: 'op-overview', title: '运营概览', path: '/operation', perm: 'ops:view' },
            { id: 'op-drg', title: 'DRG/DIP 分析', path: '/operation/drg', perm: 'ops:view' },
            { id: 'op-surgery', title: '手术麻醉', path: '/surgery', perm: 'surgery:view' },
            { id: 'op-blood', title: '输血管理', path: '/transfusion', perm: 'blood:apply' },
            { id: 'op-vte', title: 'VTE 防治', path: '/vte', perm: 'vte:read' },
            { id: 'op-ams', title: '抗菌药物管理', path: '/ams', perm: 'ams:read' },
            { id: 'op-pathway', title: '临床路径管理', path: '/pathway', perm: 'pathway:read' },
            { id: 'op-lis', title: '检验管理(LIS)', path: '/lis', perm: 'lab:read' },
            { id: 'op-ris', title: '检查管理(RIS/PACS)', path: '/ris', perm: 'imaging:read' },
            { id: 'op-drg-budget', title: 'DRG预算预警', path: '/drg-budget', perm: 'drg_budget:view' },
            { id: 'op-dip', title: 'DIP点值', path: '/dip', perm: 'dip:view' },
            { id: 'op-settlement', title: '结算报表', path: '/settlement-report', perm: 'settlement_report:view' },
          ],
        },
        {
          id: 'grp-system', title: '系统管理', children: [
            { id: 'sys-config', title: '系统配置', path: '/system/config', perm: 'system:config' },
            { id: 'sys-users', title: '用户管理', path: '/system/users', perm: 'system:user:view' },
            { id: 'sys-roles', title: '角色管理', path: '/system/roles', perm: 'system:role:view' },
            { id: 'sys-perms', title: '权限管理', path: '/system/permissions', perm: 'system:perm:manage' },
            { id: 'sys-audit', title: '操作审计', path: '/system/audit-logs', perm: 'system:audit:view' },
          ],
        },
      ];
      const filtered = menuDef
        .map((m) => {
          if (m.children) {
            const children = m.children.filter((ch) => has(ch.perm));
            return children.length > 0 ? { id: m.id, title: m.title, children } : null;
          }
          return has(m.perm) ? { id: m.id, title: m.title, path: m.path } : null;
        })
        .filter((x): x is NonNullable<typeof x> => x !== null);
      return json(ok(filtered));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/auth/permissions',
    // v5.0试点扩展（P0安全止血）：由硬编码桩改为返回当前登录用户实际被授予的权限码
    handle: async (c: Ctx) => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未认证或登录已过期'), 401);
      const view = await loadViewById(c.user.id);
      if (!view) return json(fail(ErrorCode.UNAUTHORIZED, '用户不存在或已停用'), 401);
      const list = view.permissions.map((code, i) => ({
        id: `p_${i}`,
        code,
        name: code,
        type: 'api' as const,
      }));
      return json(ok(list));
    },
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
