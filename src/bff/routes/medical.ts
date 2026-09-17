/**
 * 健澜科技数智医院智能体 - BFF 医疗工具统一入口
 *
 * POST /api/v1/medical/:toolName  -> 委托 MedicalToolRegistry 执行。
 * 此处为契约占位：生产环境注入真实 ToolExecutor。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, json, ok, type RouteDef } from '../types';

export const medicalRoutes: RouteDef[] = [
  {
    method: 'POST',
    path: '/api/v1/medical/:toolName',
    handle: async (c: Ctx) => {
      const body = await c.body<Record<string, unknown>>();
      // 生产：toolExecutor.execute(c.params.toolName, body, c.user)
      return json(
        ok({
          tool: c.params.toolName,
          success: true,
          echo: body,
          executedBy: c.user?.name ?? 'unknown',
        }),
      );
    },
    auth: true,
  },
];
