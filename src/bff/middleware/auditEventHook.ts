/**
 * 健澜AI原生医院操作系统OS - P4-2 审计中间件全局埋点
 *
 * 在 server.ts finally 块调用 auditEventHook(ctx, status)，
 * 把所有非 GET 的 /api/v1/* 状态变更写入 P4-1 内存哈希链审计。
 *
 * 关键约束：
 *  - after-hook 失败绝不能影响业务响应（try/catch 全包裹，fire-and-forget）
 *  - 不记录 GET / OPTIONS / HEAD（只读噪音）
 *  - 不递归记录 /api/v1/audit/* 自身
 *  - 健康检查端点跳过
 *  - 401/403 无 token 也要记录（actorId=anonymous, result=forbidden）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { Ctx } from '../types';
import { recordEvent, type ActorRole, type AuditAction, type AuditResult } from '../aggregators/auditEventAggregator.js';

const METHOD_TO_ACTION: Record<string, AuditAction> = {
  POST: 'create', PUT: 'update', PATCH: 'update', DELETE: 'delete',
};

// P4-4：登录/登出特殊路径 → action 特例（不按 method 记 create）
const PATH_ACTION_OVERRIDE: Record<string, AuditAction> = {
  '/api/v1/auth/login': 'login',
  '/api/v1/auth/demo-login': 'login',
  '/api/v1/auth/logout': 'logout',
};

const SKIP_PATH_PREFIXES = [
  '/api/v1/audit/',     // 审计自身不递归
  '/health', '/ready', '/metrics', '/livez', '/version',
  '/ws/',
];
const SKIP_EXACT = new Set([
  '/api/v1/health', '/api/v1/system/health',
]);

/**
 * P5-7 归档控制面路径：这些调用只用于驱动/观察归档本身。
 * 若它们的审计事件进入 WORM 待归档池，每 tick/seal 都会自我喂养一次
 * （seal 一结束就留下 1 条待归档事件，阈值随即被自己推高），形成自激封段；
 * 若改为“记录但排除出段”，又会在 fromSeq/toSeq 上留 seq 空洞，
 * 使 checkSeqContinuity 必然误报 broken。
 * 因此与 /api/v1/audit/、/health 同规则：不进审计链。
 * 可观测性由独立账本承担——tick 落 <wormDir>/_history.json（环形 1000 条），
 * seal 落段记录（segmentId/sealedAt/fromSeq/toSeq/eventCount/segmentHash）。
 */
const ARCHIVE_CONTROL_PATHS = new Set([
  '/api/v1/worm/auto/tick',
  '/api/v1/worm/segments/seal',
]);

function pickRole(roles: string[]): ActorRole {
  if (!roles || roles.length === 0) return 'system';
  const r = roles[0].toLowerCase();
  if (r === 'doctor' || r === 'nurse' || r === 'pharmacist' || r === 'admin' || r === 'patient') return r;
  return 'system';
}

function pickResult(status: number): AuditResult {
  if (status === 403 || status === 401) return 'forbidden';
  if (status >= 400) return 'failure';
  return 'success';
}

export interface HookInput {
  ctx: Ctx;
  status: number;
}

/**
 * after-hook 入口：把一次 HTTP 状态变更落为 AuditEvent。
 * 任何异常吞掉，绝不影响业务响应。
 */
export async function auditEventHook(input: HookInput): Promise<void> {
  try {
    const { ctx, status } = input;
    const method = ctx.req.method.toUpperCase();
    const url = new URL(ctx.req.url, 'http://internal');
    const path = url.pathname;

    // 只读方法不记
    if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') return;
    // 只记 /api/v1/*
    if (!path.startsWith('/api/v1/')) return;
    // 白名单跳过
    for (const p of SKIP_PATH_PREFIXES) if (path.startsWith(p)) return;
    if (SKIP_EXACT.has(path)) return;
    // 归档控制面不记（防自激，见 ARCHIVE_CONTROL_PATHS 注释）
    if (ARCHIVE_CONTROL_PATHS.has(path)) return;

    // method → action；P4-4：登录/登出路径特例
    const action: AuditAction = PATH_ACTION_OVERRIDE[path] ?? (METHOD_TO_ACTION[method] ?? ('view' as AuditAction));

    // 段切分：['api','v1','<module>','<resourceType>','<resourceId>',...]
    const segs = path.split('/').filter(Boolean);
    const module = segs[2] ?? 'unknown';
    // 健康/健康检查类路径已跳过；这里取 resourceType
    const resourceType = segs[3] ?? segs[2] ?? 'unknown';
    const resourceId = segs[4] ?? '-';  // 根路径（如 /api/v1/cds/checks）无 id 时落 '-'

    // P4-4：从 rawBody 提取 patientId（失败不阻塞审计）
    let patientId: string | undefined;
    try {
      if (ctx.rawBody && ctx.rawBody.trim().length > 0) {
        const parsed = JSON.parse(ctx.rawBody) as Record<string, unknown>;
        if (typeof parsed.patientId === 'string') patientId = parsed.patientId;
      }
    } catch { /* 静默 */ }

    // actor
    const user = ctx.user;
    const actorId = user?.id ?? 'anonymous';
    const actorRole: ActorRole = user ? pickRole(user.roles) : 'system';

    // 越权探测（401 无 token）也要记
    const result = pickResult(status);

    const ip = ctx.clientIp || '0.0.0.0';
    const userAgent = ctx.req.headers?.get?.('user-agent') ?? 'unknown';

    // P5-13：async 写穿。失败只 log/metric，不阻断业务（业务已在 finally 前完成）
    const r = await recordEvent({
      actorId, actorRole, action, module,
      resourceType, resourceId, patientId,
      result,
      errorCode: status >= 400 ? String(status) : undefined,
      ip, userAgent,
    });
    if (!r.result.ok || !r.result.persisted) {
      console.error(`[audit] hook record non-fatal: ok=${r.result.ok} persisted=${r.result.persisted} reason=${r.result.reason ?? ''}`);
    }
  } catch (e) {
    // 审计不能拖垮业务；最后兜底只 log
    console.error('[audit] hook unhandled:', e instanceof Error ? e.message : String(e));
  }
}
