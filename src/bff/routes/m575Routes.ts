/**
 * 健澜科技 jlmedaios - M575 新标准 P8：病程记录
 *
 * 去重说明：GET /api/v1/progress-notes、POST /api/v1/progress-notes、
 * POST /api/v1/progress-notes/:id/sign 已由既有 progressNote.ts（DB 后端 + 权限 +
 * listView/createView/signView）注册在线，且实测 POST 已内置 8h/6h 业务校验：
 *   - noteType='first' 距 admissionDate>8h → 400 first_note_must_within_8h
 *   - noteType='rescue' 距 rescueEndTime>6h → 400 rescue_note_must_within_6h
 *
 * 本路由文件**不重复注册任何端点**（按 M555/M561/M570/M571 去重纪律），
 * 仅保留占位导出名以维持 server.ts 注册锚点顺序一致。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { RouteDef } from '../types';

export const m575Routes: RouteDef[] = [
  // 0 新增端点：progressNote.ts 已注册 GET / POST / POST :id/sign 三端点
  // 且 8h/6h 业务校验已在线（实测 400 first_note_must_within_8h / rescue_note_must_within_6h）
];
