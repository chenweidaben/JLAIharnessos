/**
 * MEDMUSE BFF 存活/就绪健康检查路由。
 *
 * GET /api/v1/health
 *  - 免鉴权（供 k8s liveness/readiness 探针与负载均衡探活使用）；
 *  - 返回 { status, uptime, db, version }：
 *      status  - 固定 'ok'（进程存活即可达）
 *      uptime  - 进程已运行秒数
 *      db      - 'connected'（真实模式）或 'demo'（演示模式，无 DB）
 *      version - 应用版本（APP_VERSION，缺省回退 0.1.0）
 *
 * 本路由只读运行时状态，不查库、不产生副作用。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, type Ctx, type RouteDef } from '../types';
import { getEnv } from '../config/env';

/** 应用版本：优先取 APP_VERSION 环境变量，缺省回退包版本 */
const VERSION = process.env.APP_VERSION ?? '0.1.0';

export const healthRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/health',
    auth: false,
    handle(_c: Ctx): Response {
      const cfg = getEnv();
      return json({
        status: 'ok' as const,
        /** 进程已运行秒数（保留一位小数） */
        uptime: Math.round(process.uptime() * 10) / 10,
        db: cfg.demoMode ? ('demo' as const) : ('connected' as const),
        version: VERSION,
      });
    },
  },
];
