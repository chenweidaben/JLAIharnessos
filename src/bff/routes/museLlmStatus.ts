/**
 * MUSE LLM 适配层状态路由（M118-C）。
 *
 * GET /api/v1/muse/llm/status
 *  - 免鉴权（运维 / 前端诊断模型健康用）；
 *  - 返回当前 LLM 配置与运行时健康状态：
 *      mode              实际生效模式（demo | openai | ollama）
 *      requestedProvider 环境变量 LLM_PROVIDER 原始值
 *      apiUrl            推理端点（不含密钥）
 *      model             模型名
 *      healthy           最近一次健康探测结果（null = 未探测）
 *      degraded          是否处于运行时降级状态
 *      warningCount      累计告警条数
 *      recentWarnings    最近告警（不含敏感信息）
 *
 * 安全：本路由刻意不返回 apiKey 及任何 Authorization 头内容。
 *
 * 依据宪法第三章：医疗卫生信息系统须保证业务连续可观测，状态可视是分级诊疗
 * 与应急切换的前提。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { json, type RouteDef } from '../types';
import { getLLMAdapter } from '../llm/llmAdapter';

export const museLlmStatusRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/muse/llm/status',
    auth: false,
    handle(): Response {
      // status() 快照在适配层内部已剔除 apiKey，此处直接透传
      return json(getLLMAdapter().status());
    },
  },
];
