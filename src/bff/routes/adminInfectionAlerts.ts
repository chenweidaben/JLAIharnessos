/**
 * 健澜科技 jlmedaios - 院感监测预警 BFF 路由（M130-B，管理驾驶舱）
 *
 * GET /api/v1/admin/infection/alerts（仅 admin 角色可读）
 *  - 返回全院各病区院感风险检测结论，high/critical 病区立即标红（redAlert）；
 *  - 风险识别 / 聚集检测 / 预警分级全部下沉到纯函数
 *    detectInfectionRisk，本路由只做鉴权与数据装配；
 *  - 当前接入内置近实时监测信号种子数据（不含任何 PII），后续可平滑替换为
 *    HIS 生命体征 / 手术麻醉 / LIS 微生物 / 监护系统的实时聚合，函数签名不变。
 *
 * 【核心业务深化】发现 high/critical 风险病区立即在管理驾驶舱红色预警。
 * 生产安全：仅 admin 角色（requireRole 内部处理 401/403），只读、无写副作用、
 * 不暴露患者身份明细（仅 patientId 内部编码），不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  detectInfectionRisk,
  type InfectionPatientSignal,
  type RiskResult,
  type WardContext,
} from '../aggregators/infectionMonitoringAggregator.js';

/**
 * 管理驾驶舱种子数据：各病区当前监测信号（演示/灰度用，后续接业务库实时聚合）。
 * patientId 为内部编码，不含患者身份信息。
 */
interface WardSeed {
  ward: WardContext;
  patients: InfectionPatientSignal[];
}

const SEED_WARDS: WardSeed[] = [
  // 重症医学科：3 例发热聚集 + 2 例 VAP → high 红色预警
  {
    ward: { wardCode: 'W-ICU', wardName: '重症医学科', census: 12 },
    patients: [
      { patientId: 'p-1001', temperature: 38.6, feverAt: '2026-10-16T06:00:00Z', ventilated: true, ventHours: 72, vapSuspected: true },
      { patientId: 'p-1002', temperature: 38.2, feverAt: '2026-10-16T02:00:00Z', ventilated: true, ventHours: 96, vapSuspected: true },
      { patientId: 'p-1003', temperature: 38.9, feverAt: '2026-10-15T20:00:00Z', ventilated: false, ventHours: 0 },
    ],
  },
  // 呼吸内科：2 例 CRAB 同种耐药菌 → critical 暴发预警
  {
    ward: { wardCode: 'W-RESP', wardName: '呼吸内科', census: 45 },
    patients: [
      { patientId: 'p-2001', mdro: 'CRAB' },
      { patientId: 'p-2002', mdro: 'CRAB', temperature: 38.1, feverAt: '2026-10-16T07:00:00Z' },
      { patientId: 'p-2003', mdro: 'ESBL' },
    ],
  },
  // 普外科：1 例术后 12 天 SSI → medium（不标红）
  {
    ward: { wardCode: 'W-SURG', wardName: '普外科', census: 38 },
    patients: [
      { patientId: 'p-3001', postOpDays: 12, ssiSuspected: true },
    ],
  },
  // 普通病房：无信号 → low 绿色
  {
    ward: { wardCode: 'W-GEN', wardName: '普通病房', census: 40 },
    patients: [
      { patientId: 'p-4001', temperature: 36.8 },
      { patientId: 'p-4002', temperature: 37.1 },
    ],
  },
];

/** 分级权重，用于排序：critical > high > medium > low */
const LEVEL_ORDER: Record<RiskResult['overallLevel'], number> = {
  critical: 0,
  high: 1,
  medium: 2,
  low: 3,
};

/**
 * GET /api/v1/admin/infection/alerts
 * 院感风险病区红色预警总览（管理驾驶舱，仅 admin）。
 */
async function handleInfectionAlerts(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const results: RiskResult[] = SEED_WARDS.map((w) => detectInfectionRisk(w.patients, w.ward));
    // 【核心业务深化】红色预警优先：按严重度排序，病区内信号一并按权重排
    results.sort((a, b) => LEVEL_ORDER[a.overallLevel] - LEVEL_ORDER[b.overallLevel]);

    const summary: Record<RiskResult['overallLevel'], number> = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
    };
    for (const r of results) summary[r.overallLevel] += 1;

    return json(
      ok({
        generatedAt: new Date().toISOString(),
        totalWards: results.length,
        redWards: results.filter((r) => r.redAlert).length,
        summary,
        alerts: results,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '院感监测预警聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminInfectionAlertsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/infection/alerts',
    auth: true,
    handle: handleInfectionAlerts,
  },
];
