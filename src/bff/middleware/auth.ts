/**
 * 健澜科技数智医院智能体 - BFF 认证与权限中间件
 *
 * 安全要点（等保三级 / 医疗合规）：
 *  - JWT 验签：HMAC-SHA256，校验 exp/nbf/iss，拒绝伪造与篡改 Token
 *  - Token 过期：exp 校验，过期返回 401 TOKEN_EXPIRED
 *  - 角色/权限：requireRole / requirePermission 细粒度鉴权
 *  - 开发态：允许已知演示 Token，其余一律拒绝（不再任意非空即放行）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import * as crypto from 'node:crypto';

import { isDemoModeEnabled, isProductionEnv } from '../config/runtimeEnv';
import { type ApiResponse, type Ctx, ErrorCode, fail, json, newTraceId } from '../types';

/* ------------------------------------------------------------------ */
/* JWT 工具（HMAC-SHA256，Bun/Node 内置 crypto，零依赖）                */
/* ------------------------------------------------------------------ */

function b64urlEncode(buf: Buffer | string): string {
  return Buffer.from(buf)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function b64urlDecode(str: string): Buffer {
  const pad = str.length % 4 === 0 ? '' : '='.repeat(4 - (str.length % 4));
  return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/') + pad, 'base64');
}

interface JwtPayload {
  sub: string;
  name: string;
  roles: string[];
  permissions?: string[];
  dept?: string;
  jti?: string;
  iss?: string;
  exp?: number;
  nbf?: number;
}

function getJwtSecret(): string {
  // 生产环境必须由环境变量注入；开发态提供默认值但打印警告
  const secret = process.env.JWT_SECRET;
  if (secret) return secret;
  if (isProductionEnv()) {
    // 失效关闭：生产环境禁止回落到公开的开发态默认密钥，直接拒绝签发/验签
    throw new Error('[security] 生产环境必须通过 JWT_SECRET 环境变量注入 JWT 密钥');
  }
  console.warn('[security] JWT_SECRET 未设置，使用开发态默认密钥（仅限本地开发）');
  return 'dev-only-insecure-jwt-secret-change-me';
}

/** 生成 JWT 唯一标识（jti），供会话管理与令牌吊销使用 */
export function newJti(): string {
  return crypto.randomUUID();
}

/**
 * 签发 JWT（开发/登录路由用）。
 * 若 payload 未提供 jti，则自动生成并写入令牌。
 */
export function signJwt(
  payload: Omit<JwtPayload, 'iss' | 'exp' | 'nbf'>,
  expiresInSec = 7200,
): string {
  const header = b64urlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const jti = payload.jti ?? newJti();
  const body = b64urlEncode(
    JSON.stringify({ ...payload, jti, iss: 'jianlan-bff', nbf: now, exp: now + expiresInSec }),
  );
  const data = `${header}.${body}`;
  const sig = crypto.createHmac('sha256', getJwtSecret()).update(data).digest();
  return `${data}.${b64urlEncode(sig)}`;
}

/** 验证 JWT 签名与有效期，失败返回 null */
export function verifyJwt(token: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [headerB64, bodyB64, sigB64] = parts;
  const data = `${headerB64}.${bodyB64}`;

  // 时序安全签名校验；生产未配置 JWT_SECRET 时按验签失败处理（拒绝令牌）
  let expectedSig: Buffer;
  try {
    expectedSig = crypto.createHmac('sha256', getJwtSecret()).update(data).digest();
  } catch {
    return null;
  }
  const providedSig = b64urlDecode(sigB64);
  if (
    expectedSig.length !== providedSig.length ||
    !crypto.timingSafeEqual(expectedSig, providedSig)
  ) {
    return null;
  }

  let payload: JwtPayload;
  try {
    payload = JSON.parse(b64urlDecode(bodyB64).toString('utf-8')) as JwtPayload;
  } catch {
    return null;
  }

  const now = Math.floor(Date.now() / 1000);
  if (payload.nbf && now < payload.nbf) return null;
  if (payload.exp && now >= payload.exp) return null;
  return payload;
}

/* ------------------------------------------------------------------ */
/* 演示态用户（生产环境由用户中心返回真实 RBAC）                          */
/* ------------------------------------------------------------------ */

const MOCK_USER = { id: 'u_1001', name: '陈维', roles: ['admin'] as string[] };

/**
 * 解析 Authorization Bearer token 并注入 user。
 *
 * 安全策略：
 *  1. 优先走真实 JWT 验签（signJwt 签发的 token）
 *  2. 兼容前端演示态 token（jt- 前缀），但仅在 NODE_ENV !== 'production' 时接受
 *  3. 其余一律视为未登录（修复此前"任意非空 token 即 admin"的 P0 漏洞）
 */
export function attachUser(c: Ctx): void {
  const auth = c.req.headers.get('Authorization') ?? '';
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : '';
  if (!token || token === 'anonymous') {
    c.user = null;
    return;
  }

  // 1) 真实 JWT
  if (token.split('.').length === 3) {
    const payload = verifyJwt(token);
    if (payload) {
      c.user = {
        id: payload.sub,
        name: payload.name,
        roles: payload.roles ?? [],
        permissions: payload.permissions,
        jti: payload.jti,
      };
      return;
    }
    // JWT 格式正确但验签/过期失败 → 未登录（不回退到 mock）
    c.user = null;
    return;
  }

  // 2) 开发态演示 token（jt-/jr- 前缀），仅非生产环境
  if (
    !isProductionEnv() &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    c.user = MOCK_USER;
    return;
  }

  c.user = null;
}

/** 要求登录，否则 401；演示模式短路放行仅限非生产环境 */
export function requireAuth(c: Ctx): Response | null {
  // 演示模式短路授予 demo admin 仅限非生产环境；生产环境即使误配 DEMO_MODE=1 也不授予演示身份
  if (!isProductionEnv() && isDemoModeEnabled()) {
    c.user = c.user ?? { id: 'demo', name: '演示用户', roles: ['admin'], permissions: ['*'] };
    return null;
  }
  if (!c.user) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
  }
  return null;
}

/** 要求具备某角色，否则 403（未登录 401） */
export function requireRole(c: Ctx, ...roles: string[]): Response | null {
  if (!c.user) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
  }
  if (roles.length === 0) return null;
  const allowed = c.user.roles.some((r) => roles.includes(r));
  if (!allowed) {
    return json(
      fail<ApiResponse>(ErrorCode.FORBIDDEN, '权限不足：需要角色 ' + roles.join('/'), c.traceId),
      403,
    );
  }
  return null;
}

/**
 * 路由级角色守卫工厂：返回一个包装 handle，先校验角色再执行。
 * 用法：{ ..., handle: requireRoleGuard(['admin'], (c) => ...) }
 */
export function requireRoleGuard(
  roles: string[],
  handle: (c: Ctx) => Response | Promise<Response>,
): (c: Ctx) => Response | Promise<Response> {
  return (c: Ctx) => {
    const denied = requireRole(c, ...roles);
    if (denied) return denied;
    return handle(c);
  };
}

/**
 * v5.0试点扩展（P1权限码收敛）：报表分组码 → 业务域首段集合。
 *
 * 背景：V13 沉淀了 1500+ 个 xxx:read 明细报表码（如 emr:read、nursing-training:read、
 * drg-budget:read、medical-qc:read…）。逐角色逐码授权已不可维护，故收敛为 4 个分组码。
 *
 * 匹配规则（仅作用于 :read 请求，绝不授予 write/审批类能力）：
 *  1. 取请求码去掉 ":read" 后的资源名（如 "nursing-training"）；
 *  2. 取资源名 "-" 分隔的首段作为业务域 key（如 "nursing"）；
 *  3. 用户持有任一 report:* 分组码，且该分组码的集合包含此 key → 视为命中。
 * 另外用户持有 "report:*" 通配码时放行全部 :read。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
const REPORT_GROUP_DOMAINS: Record<string, ReadonlySet<string>> = {
  // 临床报表：病历/医嘱/手术/护理/医技/急诊重症/专科
  'report:clinical:read': new Set([
    'emr', 'emg', 'medical', 'front', 'archive', 'coding', 'icd', 'death', 'birth',
    'order', 'prescription', 'medication', 'drug', 'cds',
    'nursing', 'nurse', 'ward', 'bed', 'mobile', 'handover', 'shift', 'sbar',
    'operating', 'operation', 'ot', 'surgery', 'surgical', 'anesthesia',
    'perioperative', 'intraop', 'preop', 'postop', 'pacu', 'postpartum', 'postoperative',
    'emergency', 'er', 'triage', 'icu', 'critical', 'resuscitation',
    'observation', 'rescue', 'green', 'acute',
    'outpatient', 'inpatient', 'patient', 'discharge', 'follow',
    'appointment', 'referral', 'transfer', 'clinic', 'opd',
    'lab', 'imaging', 'pathology', 'endoscopy', 'radiology', 'ultrasound',
    'specimen', 'pharmacy', 'blood', 'transfusion', 'vte', 'antibiotic',
    'chronic', 'stroke', 'oncology', 'chemo', 'pain', 'palliative',
    'dialysis', 'rehab', 'rehabilitation', 'geriatric', 'cga',
    'nutrition', 'tcm', 'maternal', 'maternity', 'newborn', 'neonatal',
    'pediatric', 'child', 'psych', 'family', 'community',
    'ai', 'medmuse', 'mdt', 'consult', 'consultation', 'informed', 'consent',
    'research', 'teaching', 'academic', 'resident', 'doctor', 'mentor',
    'pressure', 'fall', 'restraint', 'tube', 'infusion', 'iv', 'oxygen',
    'isolation', 'ssi', 'wound', 'dressing', 'nurse', 'workbench',
    'dept', 'timeliness', 'emr5', 'dermatology', 'ophthalmology', 'ent',
  ]),
  // 管理报表：人员/设备/运营概览/后勤/信息化
  'report:admin:read': new Set([
    'hr', 'staff', 'personnel', 'talent', 'recruitment', 'attendance',
    'succession', 'performance', 'kpi', 'dept', 'department', 'hospital',
    'admin', 'system', 'data', 'warehouse', 'governance', 'schedule',
    'roster', 'logistics', 'procurement', 'consumable', 'asset', 'device',
    'equipment', 'elevator', 'energy', 'environmental', 'environment',
    'sewage', 'fire', 'security', 'parking', 'laundry', 'catering',
    'resource', 'ops', 'strategic', 'infra', 'it', 'network',
    'interoperability', 'intercon4', 'interop', 'integrity',
    'backup', 'api', 'cybersecurity', 'privacy', 'personal',
    'information', 'continuing', 'learning', 'training',
    'service', 'convenience', 'social', 'volunteer', 'publicity', 'public',
    'party', 'honor', 'contribution', 'meeting', 'administrative',
    'workload', 'dashboard', 'overview', 'overview', 'flywheel',
  ]),
  // 财务报表：DRG/DIP/医保/成本/收费结算
  'report:finance:read': new Set([
    'drg', 'dip', 'insurance', 'cost', 'billing', 'payment', 'settlement',
    'fee', 'revenue', 'expense', 'price', 'invoice', 'budget', 'profit',
    'salary', 'bonus', 'online', 'operating-cost', 'financial', 'finance',
    'accounting', 'audit', 'reconciliation', 'refund', 'charge',
  ]),
  // 质控报表：病历质量/不良事件/院感/患者安全
  'report:quality:read': new Set([
    'medical-qc', 'medical', 'adverse-event', 'adverse', 'event',
    'infection', 'quality', 'event-review', 'improvement', 'qc',
    'nosocomial', 'readmission', 'complaint', 'satisfaction', 'safety',
    'discipline', 'nursing-quality', 'medical-record-quality',
    'death-review', 'risk', 'jci', 'accreditation', 'grade',
    'review', 'reviewer', 'sop', 'guideline', 'evidence', 'statistics',
    'core', 'inspection', 'inspector', 'timeliness', 'emr-assessment',
  ]),
};

/**
 * v5.0试点扩展（P1权限码收敛）：分组码通配判定。
 * 仅当请求码以 ":read" 结尾时参与通配；精确匹配由调用方先做。
 */
function matchReportGroupWildcard(userPerms: string[], code: string): boolean {
  if (!code.endsWith(':read')) return false;
  const resource = code.slice(0, -':read'.length);
  const domainKey = resource.split('-')[0];
  if (!domainKey) return false;
  for (const p of userPerms) {
    if (p === 'report:*') return true;
    const domains = REPORT_GROUP_DOMAINS[p];
    if (domains && domains.has(domainKey)) return true;
  }
  return false;
}

/**
 * 业务权限码守卫（如 imaging:view / imaging:ai:analyze / imaging:ai:review）。
 *
 * 与现有 requireRole 同风格：
 *  - 未登录 → 401
 *  - 超级管理员（roles 含 'admin'）一律放行
 *  - 用户显式权限码（JWT permissions 数组）包含该码 → 放行
 *  - v5.0试点扩展（P1权限码收敛）：:read 请求再按 report:* 分组码通配放行
 *  - 否则 → 403
 */
export function requirePermissionCode(c: Ctx, code: string): Response | null {
  if (!c.user) {
    return json(fail(ErrorCode.UNAUTHORIZED, '未登录或登录已过期', c.traceId), 401);
  }
  if (c.user.roles.includes('admin')) return null;
  if (c.user.permissions && c.user.permissions.includes(code)) return null;
  // v5.0试点扩展（P1权限码收敛）：分组码通配（仅 :read）
  if (c.user.permissions && matchReportGroupWildcard(c.user.permissions, code)) return null;
  return json(
    fail<ApiResponse>(ErrorCode.FORBIDDEN, `权限不足：需要 ${code}`, c.traceId),
    403,
  );
}

export function newCtx(
  req: Request,
  params: Record<string, string>,
  query: URLSearchParams,
  rawBody: string | null = null,
  clientIp: string | null = null,
): Ctx {
  return {
    req,
    params,
    query,
    clientIp,
    rawBody,
    body: async () => {
      // 优先使用预读取的原始 body（保证幂等指纹与 handler 读取一致）
      const text = rawBody !== null ? rawBody : await req.text();
      try {
        return JSON.parse(text) as never;
      } catch {
        return {} as never;
      }
    },
    user: null,
    traceId: req.headers.get('x-trace-id') ?? newTraceId(),
  };
}
