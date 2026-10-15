/**
 * 健澜科技 jlmedaios - M127-D 医院运营趋势分析 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/trends/analysis
 *  - 采集按月门诊/住院量、病种分布、患者来源等原始数据，交由纯函数
 *    buildHospitalTrendAnalysis 归并为一页趋势总览；
 *  - 返回 { analysis }；当无运营数据（非演示模式）时返回合法的空结构，
 *    由前端走 empty 三态，绝不用假数据冒充真实运营结论。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 预测结果携带「基于历史数据估算」标注，仅作运营参考；
 *  - 不暴露患者个体 PII，只返回聚合统计量。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../../db/pool';
import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildHospitalTrendAnalysis,
  type HospitalTrendInput,
} from '../aggregators/hospitalTrendAggregator';

/** 演示模式开关：与 adminHealth 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/**
 * 加载运营趋势原始数据。
 *
 * 生产环境：预留数据库取数入口（当前未接入医院运营库，先返回空结构，
 * 由前端展示 empty 态，避免用假数据冒充）。
 * 演示模式：返回一份确定性的演示数据，便于在管理驾驶舱演示趋势与预测。
 */
// eslint-disable-next-line @typescript-eslint/no-unused-vars
async function loadTrendData(_range: string): Promise<HospitalTrendInput> {
  if (demoModeEnabled()) {
    return {
      volumes: [
        { month: '2026-05', outpatientVisits: 8200, inpatientAdmissions: 640 },
        { month: '2026-06', outpatientVisits: 8600, inpatientAdmissions: 690 },
        { month: '2026-07', outpatientVisits: 9100, inpatientAdmissions: 720 },
        { month: '2026-08', outpatientVisits: 9500, inpatientAdmissions: 760 },
        { month: '2026-09', outpatientVisits: 10200, inpatientAdmissions: 810 },
        { month: '2026-10', outpatientVisits: 10800, inpatientAdmissions: 860 },
      ],
      diseases: [
        { name: '高血压', count: 1860, previousCount: 1720 },
        { name: '2型糖尿病', count: 1420, previousCount: 1390 },
        { name: '冠心病', count: 980, previousCount: 1050 },
        { name: '脑卒中后遗症', count: 760, previousCount: 700 },
        { name: '慢性阻塞性肺疾病', count: 640, previousCount: 600 },
      ],
      sources: [
        { name: '本市', count: 6800 },
        { name: '本省外市', count: 2600 },
        { name: '外省', count: 1400 },
      ],
    };
  }

  // 预留：生产库取数。当前保持空，前端走 empty 态。
  try {
    // 触发 DB 探活语义（保持与既有路由一致的可达性依赖），但不读取业务明细
    void getDb();
  } catch {
    // 无连接时降级为空数据，不影响端点 200 返回
  }
  return { volumes: [], diseases: [], sources: [] };
}

/**
 * GET /api/v1/admin/trends/analysis
 * 医院运营趋势分析（管理驾驶舱，仅 admin）。
 */
async function handleTrendsAnalysis(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const range = c.query.get('range') ?? '6m';
    const rangeLabel = range === '12m' ? '近12个月' : '近6个月';
    const raw = await loadTrendData(range);
    const analysis = buildHospitalTrendAnalysis(rangeLabel, raw);
    return json(ok({ analysis, demo: demoModeEnabled() }));
  } catch (err) {
    const message = err instanceof Error ? err.message : '运营趋势数据采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const adminTrendsRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/trends/analysis',
    auth: true,
    handle: handleTrendsAnalysis,
  },
];
