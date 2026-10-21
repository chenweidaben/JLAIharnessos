/**
 * 健澜科技 jlmedaios - M576 新标准 P8：出院小结
 *
 * 去重说明：GET /api/v1/discharge-summaries、POST /api/v1/discharge-summaries、
 * POST /api/v1/discharge-summaries/:id/submit、POST /api/v1/discharge-summaries/:id/verify
 * 已由既有 dischargeSummary.ts（DB 后端 + 权限 + getSummary/upsertSummary/submitSummary/verifySummary）
 * 注册在线。conditionAtDischarge='died' 必须配 deathCause 的业务校验由既有 DB aggregator 内置。
 *
 * 本路由文件**不重复注册任何端点**（按 M555/M561/M570/M571/M575 去重纪律），
 * 仅保留占位导出名以维持 server.ts 注册锚点顺序一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RouteDef } from '../types';

export const m576Routes: RouteDef[] = [
  // 0 新增端点：dischargeSummary.ts 已注册 GET / POST / POST :id/submit / POST :id/verify
  // died_requires_death_cause 业务校验由既有 DB aggregator 内置
];
