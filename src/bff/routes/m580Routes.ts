/**
 * 健澜科技 jlmedaios - M580 新标准 P9：手术记录单
 *
 * 去重说明：GET /api/v1/surgery-records、POST /api/v1/surgery-records、
 * POST /api/v1/surgery-records/:id/sign 已由既有 surgeryRecord.ts
 * （DB 后端 + 权限 + listView/createView/signView）注册在线，且 POST 内置
 * bloodLoss 非负 + surgeryEnd>surgeryStart 业务校验。
 *
 * 本路由文件**不重复注册任何端点**（按 M555/M561/M570/M571/M575/M576 去重纪律），
 * 仅保留占位导出名以维持 server.ts 注册锚点顺序一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RouteDef } from '../types';

export const m580Routes: RouteDef[] = [
  // 0 新增端点：surgeryRecord.ts 已注册 GET / POST / POST :id/sign 三端点
  // negative_blood_loss / end_before_start 业务校验由既有 DB aggregator 内置
];
