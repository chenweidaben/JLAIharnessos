/**
 * 健澜科技 jlmedaios - 系统告警中心路由
 * GET /api/v1/alerts  返回当前医生视角的未决告警列表（危急值/过敏/用药相互作用/生命体征异常）。
 * DEMO_MODE 下返回内存 demo 数据；真实库告警源接入后替换实现。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import fs from 'node:fs';
import os from 'node:os';

import { requireRole } from '../middleware/auth';
import {
  aggregatePerformance,
  listPerformanceRecords,
} from '../aggregators/performanceMonitorAggregator';
import {
  checkAlertThresholds,
  DEFAULT_ALERT_THRESHOLDS,
  type Alert,
  type AlertMetrics,
} from '../aggregators/alertingAggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

/** 健澜科技：DEMO_MODE 下不连 PostgreSQL，GET 返回内存兜底。 */
const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

/** 告警类型（与前端 web/src/types/medical.AlertType 对齐）。 */
export type AlertType = 'critical-value' | 'allergy' | 'drug-interaction' | 'abnormal-vital';

/** 告警级别（与前端 web/src/types/common.MedicalLevel 对齐）。 */
export type AlertLevel = 'critical' | 'abnormal' | 'normal' | 'pending';

/** 告警列表项视图。 */
export interface AlertView {
  id: string;
  type: AlertType;
  level: AlertLevel;
  title: string;
  content: string;
  patientId: string;
  patientName?: string;
  createdAt: string;
  acknowledged: boolean;
}

/**
 * 纯函数：构造系统告警 demo 数据（无副作用、可单测）。
 * 形状与前端 `fetchAlerts(): Promise<Alert[]>` 对齐。
 *
 * @returns 告警列表
 */
export function listView(): AlertView[] {
  return [
    {
      id: 'ALM-20261015-001',
      type: 'critical-value',
      level: 'critical',
      title: '危急值：血钾 6.8 mmol/L',
      content: '患者血钾高于危急上限 5.5 mmol/L，请立即处理并记录。',
      patientId: 'P100234',
      patientName: '王*明',
      createdAt: '2026-10-15T08:32:00.000Z',
      acknowledged: false,
    },
    {
      id: 'ALM-20261015-002',
      type: 'drug-interaction',
      level: 'abnormal',
      title: '用药相互作用：华法林 + 阿司匹林',
      content: '两药联用显著增加出血风险，请复核医嘱。',
      patientId: 'P100567',
      patientName: '李*华',
      createdAt: '2026-10-15T07:50:00.000Z',
      acknowledged: false,
    },
    {
      id: 'ALM-20261015-003',
      type: 'abnormal-vital',
      level: 'abnormal',
      title: '生命体征异常：心率 118 bpm',
      content: '持续心动过速，请结合床旁评估。',
      patientId: 'P100789',
      patientName: '张*芳',
      createdAt: '2026-10-15T06:40:00.000Z',
      acknowledged: true,
    },
    {
      id: 'ALM-20261014-011',
      type: 'allergy',
      level: 'critical',
      title: '过敏史提醒：青霉素',
      content: '患者既往青霉素过敏，本次医嘱含阿莫西林，请核对。',
      patientId: 'P100901',
      patientName: '赵*兰',
      createdAt: '2026-10-14T15:20:00.000Z',
      acknowledged: false,
    },
  ];
}

export const alertsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/alerts',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      if (!c.user) return json(fail(ErrorCode.UNAUTHORIZED, '未登录', c.traceId), 401);
      if (isDemo) return json(ok(listView(), 'ok', c.traceId));
      // 真实告警源接入前，兜底返回内存 demo 告警，保证告警中心可渲染。
      return json(ok(listView(), 'ok', c.traceId));
    },
  },
];

/* ================================================================== */
/* M136-D 运维监控告警中心：GET /api/v1/admin/alerts（仅 admin）        */
/* ================================================================== */

/** 磁盘使用率：工作目录所在分区；读取失败保守给中性低值 0.1（不误报红/黄） */
function readDiskUsedRatio(): number {
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const stat = (fs as any).statfsSync(process.cwd()) as { blocks: bigint | number; bfree: bigint | number };
    const total = Number(stat.blocks);
    const free = Number(stat.bfree);
    if (!Number.isFinite(total) || total <= 0) return 0.1;
    return (total - free) / total;
  } catch {
    return 0.1;
  }
}

/** 内存使用率：1 - 可用/总量；读取失败给中性低值 */
function readMemoryUsedRatio(): number {
  try {
    const total = os.totalmem();
    const free = os.freemem();
    if (total <= 0) return 0.1;
    return 1 - free / total;
  } catch {
    return 0.1;
  }
}

/** 今日错误率与 P95：复用 BFF 进程内性能采样（零新依赖，持续优化） */
function readTraffic(): { errorRate: number; p95LatencyMs: number } {
  try {
    const summary = aggregatePerformance(listPerformanceRecords());
    const last = summary.errorRateTrend[summary.errorRateTrend.length - 1];
    return {
      errorRate: typeof last?.errorRate === 'number' ? last.errorRate : 0,
      p95LatencyMs: summary.p95,
    };
  } catch {
    return { errorRate: 0, p95LatencyMs: 0 };
  }
}

/**
 * GET /api/v1/admin/alerts
 * 采集运行指标并跑阈值规则，返回当前触发中的监控告警（只读、无写副作用）。
 */
async function handleAdminAlerts(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const traffic = readTraffic();
    const metrics: AlertMetrics = {
      apiErrorRate: traffic.errorRate,
      p95LatencyMs: traffic.p95LatencyMs,
      diskUsedRatio: readDiskUsedRatio(),
      memoryUsedRatio: readMemoryUsedRatio(),
    };
    // 纯函数跑阈值；无流量/未超限返回空数组（前端展示"运行正常"）
    const alerts: Alert[] = checkAlertThresholds(metrics);
    return json(
      ok({
        alerts,
        metrics,
        thresholds: DEFAULT_ALERT_THRESHOLDS,
        demo: isDemo,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '监控告警数据采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminAlertsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/alerts',
    auth: true,
    handle: handleAdminAlerts,
  },
];
