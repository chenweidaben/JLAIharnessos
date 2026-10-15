/**
 * MEDMUSE 模型运行时信息路由。
 *
 * GET /api/v1/medmuse/model-info
 *  - 免鉴权（运维/前端诊断模型健康状态用）；
 *  - 返回 { endpoint, model, timeoutMs, maxRetries, circuitState, demoMode }：
 *      endpoint     - 推理端点（不含密钥）
 *      model        - 模型名
 *      timeoutMs    - 单次请求超时（毫秒）
 *      maxRetries   - 最大重试次数
 *      circuitState - 熔断器状态（closed/open、连续失败次数）
 *      demoMode     - 是否演示/降级模式
 *
 * 安全：本路由刻意不返回 apiKey 或任何 Authorization 头，避免信息泄露。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, type Ctx, type RouteDef } from '../types';
import { getModelInfo } from '../agents/modelProvider';

export const modelInfoRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/medmuse/model-info',
    auth: false,
    handle(_c: Ctx): Response {
      // getModelInfo 已在装配层剔除 apiKey，仅回显非敏感运行参数
      return json(getModelInfo());
    },
  },
];
