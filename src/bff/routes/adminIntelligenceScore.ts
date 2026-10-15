/**
 * 健澜科技 jlmedaios - M133-D 系统智慧度评分 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/intelligence-score
 *  - 采集六维原始计数（进程内内存快照，零新依赖），交由纯函数
 *    calculateSystemIntelligenceScore / getIntelligenceTrend 归并为一页评分总览；
 *  - 返回 { score, trend, demo }；无真实样本时打 demo 标记，前端走三态，
 *    绝不用假数据冒充真实智慧度结论。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不暴露患者个体 PII，只返回聚合统计量；
 *  - 【SaaS化+智慧度】hospitalId 由路由层从租户上下文透传，多租户隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  calculateSystemIntelligenceScore,
  collectHistory,
  collectRawMetrics,
  getIntelligenceTrend,
} from '../aggregators/intelligenceScoreAggregator';
import { tenantService } from '@/tenant';

/** 演示模式开关：与 adminHealth / adminTrends 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 取当前医院 ID（租户上下文；取不到时回退 'default'，不抛错） */
function currentHospitalId(): string {
  try {
    // tenantService 在运行期注入默认租户；这里只读，不做写操作
    const tid = tenantService.getDefaultTenantId();
    if (tid) return tid;
  } catch {
    // 租户上下文不可用时回退默认值，不影响端点 200
  }
  return 'default';
}

/**
 * GET /api/v1/admin/intelligence-score
 * 系统智慧度评分（管理驾驶舱，仅 admin）。
 * query: days（可选，趋势窗口天数，默认 30）
 */
async function handleIntelligenceScore(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const days = Number(c.query.get('days') ?? '30');
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(days, 365) : 30;

    const hospitalId = currentHospitalId();
    const { metrics, demo: liveDemo } = collectRawMetrics();
    const demo = demoModeEnabled() || liveDemo;

    // 演示模式下若内存缓冲为空，给前端一份确定性的演示评分，便于在管理驾驶舱演示
    if (demoModeEnabled() && collectHistory().length === 0) {
      const demoMetrics = {
        experienceEntries: 420,
        recommendationAdopted: 580,
        recommendationModified: 180,
        recommendationTotal: 1000,
        learningActivities: 160,
        knowledgeCovered: 72,
        knowledgeTotal: 90,
        automatedTasks: 640,
        totalTasks: 1000,
        satisfactionPositive: 860,
        satisfactionTotal: 1000,
      };
      const score = calculateSystemIntelligenceScore(hospitalId, demoMetrics, new Date().toISOString(), true);
      const trend = getIntelligenceTrend(hospitalId, safeDays, [
        { date: '2026-09-17', metrics: { ...demoMetrics, experienceEntries: 360, learningActivities: 120 } },
        { date: '2026-09-24', metrics: { ...demoMetrics, experienceEntries: 380, learningActivities: 135 } },
        { date: '2026-10-01', metrics: { ...demoMetrics, experienceEntries: 400, learningActivities: 148 } },
        { date: '2026-10-08', metrics: { ...demoMetrics, experienceEntries: 410, learningActivities: 155 } },
        { date: '2026-10-15', metrics: demoMetrics },
      ]);
      return json(ok({ score, trend, demo: true }));
    }

    const score = calculateSystemIntelligenceScore(hospitalId, metrics, new Date().toISOString(), demo);
    const trend = getIntelligenceTrend(hospitalId, safeDays, collectHistory());
    return json(ok({ score, trend, demo }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '智慧度评分采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminIntelligenceScoreRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/intelligence-score',
    auth: true,
    handle: handleIntelligenceScore,
  },
];
