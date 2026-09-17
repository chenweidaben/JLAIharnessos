/**
 * 健澜科技数智医院智能体 - BFF HTTP/WebSocket 服务器
 *
 * 基于 Bun 原生运行时，零额外依赖：
 *  - REST：统一 /api/v1 前缀，聚合后端服务并适配前端
 *  - WS：/ws/chat 对话流式与告警推送（需鉴权）
 *  - 中间件：认证 / 限流 / CSRF / 安全头 / 日志 / 错误处理
 *
 * 启动：bun run src/bff/server.ts
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { attachUser, newCtx, requireAuth, verifyJwt } from './middleware/auth';
import { verifyCsrf } from './middleware/csrf';
import { withErrorHandler } from './middleware/error';
import { logRequest } from './middleware/log';
import { rateLimit } from './middleware/rateLimit';
import { withSecurityHeaders } from './middleware/securityHeaders';
import { authRoutes } from './routes/auth';
import { chatRoutes } from './routes/chat';
import { dashboardRoutes } from './routes/dashboard';
import { medicalRoutes } from './routes/medical';
import { operationRoutes } from './routes/operation';
import { patientRoutes } from './routes/patient';
import { qualityRoutes } from './routes/quality';
import { systemRoutes } from './routes/system';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from './types';

// ============================================================================
// 路由表与编译
// ============================================================================

const allRoutes: RouteDef[] = [
  ...authRoutes,
  ...patientRoutes,
  ...chatRoutes,
  ...medicalRoutes,
  ...dashboardRoutes,
  ...qualityRoutes,
  ...operationRoutes,
  ...systemRoutes,
];

interface Compiled {
  method: string;
  regex: RegExp;
  keys: string[];
  def: RouteDef;
}

function compile(pattern: string): { regex: RegExp; keys: string[] } {
  const keys: string[] = [];
  const re =
    '^' +
    pattern.replace(/:([^/]+)/g, (_m, k: string) => {
      keys.push(k);
      return '([^/]+)';
    }) +
    '$';
  return { regex: new RegExp(re), keys };
}

const compiled: Compiled[] = allRoutes.map((def) => {
  const { regex, keys } = compile(def.path);
  return { method: def.method.toUpperCase(), regex, keys, def };
});

// ============================================================================
// WebSocket（/ws/chat）— 鉴权后升级
// ============================================================================

const chatClients = new Set<Bun.ServerWebSocket<unknown>>();

function broadcast(event: string, payload: unknown): void {
  const frame = JSON.stringify({ event, ts: Date.now(), payload });
  for (const ws of chatClients) {
    try {
      ws.send(frame);
    } catch {
      chatClients.delete(ws);
    }
  }
}

/** 校验 WebSocket 升级请求的 Token（query 参数 ?token= 或 Sec-WebSocket-Protocol） */
function wsAuthorized(req: Request): boolean {
  const url = new URL(req.url);
  const token =
    url.searchParams.get('token') ??
    (req.headers.get('sec-websocket-protocol') ?? '').replace(/^bearer\./i, '');
  if (!token) return false;
  // JWT 格式
  if (token.split('.').length === 3) return verifyJwt(token) !== null;
  // 开发态演示 token
  const isProd = (process.env.NODE_ENV ?? 'development') === 'production';
  if (
    !isProd &&
    (token.startsWith('jt-') || token.startsWith('jr-') || token === 'bff-access-token')
  ) {
    return true;
  }
  return false;
}

// ============================================================================
// Fetch 入口
// ============================================================================

async function handleFetch(
  req: Request,
  server: Bun.Server<unknown>,
): Promise<Response | undefined> {
  const url = new URL(req.url);
  const startedAt = Date.now();

  // WebSocket 升级（需鉴权）
  if (url.pathname === '/ws/chat' && req.headers.get('upgrade')?.toLowerCase() === 'websocket') {
    if (!wsAuthorized(req)) {
      return new Response('unauthorized', { status: 401 });
    }
    if (server.upgrade(req, { data: { path: '/ws/chat' } })) return undefined;
    return new Response('upgrade failed', { status: 426 });
  }

  const ctx: Ctx = newCtx(req, {}, url.searchParams);
  attachUser(ctx);

  let status = 200;
  try {
    // 限流
    const limited = rateLimit(ctx);
    if (limited) {
      status = 429;
      return withSecurityHeaders(limited);
    }

    // CSRF 校验（状态变更请求）
    const csrfDenied = verifyCsrf(ctx);
    if (csrfDenied) {
      status = 403;
      return withSecurityHeaders(csrfDenied);
    }

    for (const r of compiled) {
      if (r.method !== req.method.toUpperCase()) continue;
      const m = url.pathname.match(r.regex);
      if (!m) continue;
      const params: Record<string, string> = {};
      r.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
      ctx.params = params;

      if (r.def.auth) {
        const denied = requireAuth(ctx);
        if (denied) {
          status = 401;
          return withSecurityHeaders(denied);
        }
      }
      const wrapped = withErrorHandler(r.def.handle);
      const res = await wrapped(ctx);
      status = res.status;
      return withSecurityHeaders(res);
    }

    status = 404;
    return withSecurityHeaders(
      json(
        fail(ErrorCode.NOT_FOUND, `路由不存在: ${req.method} ${url.pathname}`, ctx.traceId),
        404,
      ),
    );
  } finally {
    logRequest(ctx, status, startedAt);
  }
}

// ============================================================================
// 启动
// ============================================================================

const port = Number(process.env.HTTP_PORT ?? 8080);

const server = Bun.serve({
  port,
  async fetch(req, bunServer) {
    return (await handleFetch(req, bunServer)) ?? new Response(null, { status: 101 });
  },
  websocket: {
    open(ws) {
      chatClients.add(ws);
    },
    message(ws: Bun.ServerWebSocket<unknown>, raw: string | Buffer) {
      let parsed: { action?: string; conversationId?: string } = {};
      try {
        parsed = JSON.parse(String(raw)) as { action?: string; conversationId?: string };
      } catch {
        /* ignore */
      }
      if (parsed.action === 'start_stream') {
        // 模拟流式增量推送
        const conv = parsed.conversationId ?? 'demo';
        const parts = ['正在调阅数据……', '已获取检验结果。', '综合判断：', '建议维持当前方案。'];
        parts.forEach((delta, i) => {
          setTimeout(() => {
            ws.send(
              JSON.stringify({
                event: 'chat.stream',
                ts: Date.now(),
                payload: {
                  type:
                    i === 0
                      ? 'message_start'
                      : i === parts.length - 1
                        ? 'message_end'
                        : 'content_delta',
                  conversationId: conv,
                  delta,
                },
              }),
            );
          }, i * 300);
        });
      } else if (parsed.action === 'ping') {
        ws.send(
          JSON.stringify({ event: 'system.status', ts: Date.now(), payload: { pong: true } }),
        );
      }
    },
    close(ws) {
      chatClients.delete(ws);
    },
  },
});

// 启动后周期性推送一条告警（演示）
setInterval(() => {
  broadcast('alert.critical_value', {
    id: `al_${Date.now()}`,
    ruleName: '肌钙蛋白危急值',
    severity: 'critical',
    message: '检测到新的危急值',
    level: 'critical',
    createdAt: new Date().toISOString(),
    acknowledged: false,
  });
}, 30_000);

// eslint-disable-next-line no-console
console.log(
  `[jianlan-bff] listening on http://0.0.0.0:${port}  (WebSocket /ws/chat [auth required])`,
);

export { broadcast, ok, server };
