/**
 * 健澜科技 jlmedaios - 医疗质量监控 BFF 路由（M127-C，管理驾驶舱）
 *
 * GET /api/v1/admin/quality/monitor（仅 admin 角色可读）
 *  - 返回三甲评审六项核心质量指标的红绿灯总览 + 逐月趋势；
 *  - 指标计算与达标判断全部下沉到纯函数
 *    buildMedicalQualityMonitor / judgeIndicator，本路由只做鉴权与数据装配；
 *  - 当前接入内置近 6 个月种子数据（不含任何 PII），后续可平滑替换为
 *    院感 / 病案 / 手麻 / 药剂等业务库的实时聚合，函数签名不变。
 *
 * 生产安全：仅 admin 角色（requireRole 内部处理 401/403），只读、无写副作用、
 * 不暴露患者明细；采集异常返回结构化错误信封。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  buildMedicalQualityMonitor,
  type QualityMonthPoint,
} from '../aggregators/medicalQualityAggregator.js';

/**
 * 管理驾驶舱种子数据：近 6 个月原始计数（演示/灰度用，后续接业务库实时聚合）。
 * 数字均为全院级汇总，不含患者身份信息。
 */
const SEED_POINTS: QualityMonthPoint[] = [
  { month: '2026-05', surgeryTotal: 1200, surgeryLevel3: 288, pathwayTotal: 900, pathwayEnrolled: 432, antibioticDdd: 15200, patientDays: 38000, infectionCases: 300, dischargedCount: 3200, gradedTotal: 900, recordGradeA: 801, criticalTotal: 460, criticalOnTime: 423 },
  { month: '2026-06', surgeryTotal: 1260, surgeryLevel3: 315, pathwayTotal: 940, pathwayEnrolled: 480, antibioticDdd: 14800, patientDays: 38500, infectionCases: 280, dischargedCount: 3300, gradedTotal: 920, recordGradeA: 836, criticalTotal: 480, criticalOnTime: 461 },
  { month: '2026-07', surgeryTotal: 1300, surgeryLevel3: 351, pathwayTotal: 960, pathwayEnrolled: 509, antibioticDdd: 14200, patientDays: 39000, infectionCases: 260, dischargedCount: 3350, gradedTotal: 950, recordGradeA: 874, criticalTotal: 500, criticalOnTime: 485 },
  { month: '2026-08', surgeryTotal: 1280, surgeryLevel3: 369, pathwayTotal: 980, pathwayEnrolled: 539, antibioticDdd: 13900, patientDays: 38800, infectionCases: 250, dischargedCount: 3300, gradedTotal: 940, recordGradeA: 869, criticalTotal: 490, criticalOnTime: 478 },
  { month: '2026-09', surgeryTotal: 1320, surgeryLevel3: 396, pathwayTotal: 1000, pathwayEnrolled: 570, antibioticDdd: 13500, patientDays: 39200, infectionCases: 230, dischargedCount: 3400, gradedTotal: 960, recordGradeA: 893, criticalTotal: 510, criticalOnTime: 497 },
  { month: '2026-10', surgeryTotal: 1350, surgeryLevel3: 418, pathwayTotal: 1020, pathwayEnrolled: 592, antibioticDdd: 13100, patientDays: 39500, infectionCases: 220, dischargedCount: 3450, gradedTotal: 980, recordGradeA: 906, criticalTotal: 520, criticalOnTime: 510 },
];

/**
 * GET /api/v1/admin/quality/monitor
 * 医疗质量监控总览（管理驾驶舱，仅 admin）。
 */
async function handleQualityMonitor(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const monitor = buildMedicalQualityMonitor({ points: SEED_POINTS });
    return json(ok(monitor));
  } catch (err) {
    const message = err instanceof Error ? err.message : '医疗质量监控数据聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminQualityMonitorRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/quality/monitor',
    auth: true,
    handle: handleQualityMonitor,
  },
];
