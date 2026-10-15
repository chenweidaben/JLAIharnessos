/**
 * 健澜科技 jlmedaios - M146-A 医院智慧资产看板 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/wisdom/dashboard
 *  - 采集全院智慧资产原始计数（进程内内存快照，零新依赖），交由纯函数
 *    buildHospitalWisdomDashboard / getWisdomGrowthReport 归并为一页看板；
 *  - 返回 { dashboard, report, demo }；无真实样本时打 demo 标记，
 *    前端走三态，绝不用假数据冒充真实智慧资产结论。
 *
 * 【越用越聪明深化】：看板五维资产卡（经验/病种/AI 调用/活跃医生/智慧度总分）
 *   + 六维雷达 + 医生成长截面 + 近 N 期增长报告，让院长看到「医院越来越聪明」。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不暴露患者个体 PII 与医生个人明细，只返回聚合统计量；
 *  - hospitalId 由路由层从租户上下文透传，多租户隔离。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildHospitalWisdomDashboard,
  getWisdomGrowthReport,
  type WisdomAssetInput,
  type WisdomSnapshotPoint,
} from '../aggregators/wisdomDashboardAggregator';
import { tenantService } from '@/tenant';

/** 演示模式开关：与 adminHealth / adminTrends / adminIntelligenceScore 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 取当前医院 ID（租户上下文；取不到时回退 'default'，不抛错） */
function currentHospitalId(): string {
  try {
    const tid = tenantService.getDefaultTenantId();
    if (tid) return tid;
  } catch {
    // 租户上下文不可用时回退默认值，不影响端点 200
  }
  return 'default';
}

/* -------------------- 进程内内存采集（零新依赖，仅本模块） -------------------- */

/** 当前资产计数快照（累计口径；演示模式下由种子数据兜底） */
const live: WisdomAssetInput = {
  experienceTotal: 0,
  coveredDiseases: 0,
  aiAssistantCalls: 0,
  activeDoctors: 0,
  doctorGrowth: [],
  recommendationAdopted: 0,
  recommendationModified: 0,
  recommendationTotal: 0,
  satisfactionPositive: 0,
  satisfactionTotal: 0,
};

/** 历史快照缓冲（由旧到新；日终/月度调度触发，本模块不自带定时器） */
const historyBuffer: WisdomSnapshotPoint[] = [];
const HISTORY_CAP = 24;

function hasLiveSamples(): boolean {
  return (
    live.experienceTotal > 0 ||
    live.coveredDiseases > 0 ||
    live.aiAssistantCalls > 0 ||
    live.recommendationTotal > 0 ||
    live.satisfactionTotal > 0 ||
    live.doctorGrowth.length > 0
  );
}

/** 演示模式种子数据（与看板口径一致的确定性样本，便于演示「越用越聪明」） */
function demoInput(): WisdomAssetInput {
  return {
    experienceTotal: 1480,
    coveredDiseases: 226,
    aiAssistantCalls: 38400,
    activeDoctors: 86,
    doctorGrowth: [
      { doctorId: 'd1', doctorName: '王主任', deptCode: 'IN', growthScore: 88, experienceCount: 320 },
      { doctorId: 'd2', doctorName: '李医生', deptCode: 'IN', growthScore: 76, experienceCount: 210 },
      { doctorId: 'd3', doctorName: '赵医生', deptCode: 'SU', growthScore: 69, experienceCount: 150 },
      { doctorId: 'd4', doctorName: '陈医生', deptCode: 'PE', growthScore: 58, experienceCount: 96 },
    ],
    recommendationAdopted: 620,
    recommendationModified: 190,
    recommendationTotal: 1000,
    satisfactionPositive: 840,
    satisfactionTotal: 1000,
  };
}

/** 演示模式历史：近 6 期智慧资产稳步上行 */
function demoHistory(): WisdomSnapshotPoint[] {
  return [
    { period: '2026-05', experienceTotal: 980, coveredDiseases: 168, aiAssistantCalls: 22000, wisdomScore: 58.4, avgDoctorGrowth: 52 },
    { period: '2026-06', experienceTotal: 1120, coveredDiseases: 184, aiAssistantCalls: 26500, wisdomScore: 63.1, avgDoctorGrowth: 57 },
    { period: '2026-07', experienceTotal: 1240, coveredDiseases: 196, aiAssistantCalls: 30200, wisdomScore: 67.6, avgDoctorGrowth: 61 },
    { period: '2026-08', experienceTotal: 1330, coveredDiseases: 208, aiAssistantCalls: 33800, wisdomScore: 71.2, avgDoctorGrowth: 64 },
    { period: '2026-09', experienceTotal: 1410, coveredDiseases: 218, aiAssistantCalls: 36400, wisdomScore: 74.5, avgDoctorGrowth: 67 },
    { period: '2026-10', experienceTotal: 1480, coveredDiseases: 226, aiAssistantCalls: 38400, wisdomScore: 77.8, avgDoctorGrowth: 73 },
  ];
}

/**
 * GET /api/v1/admin/wisdom/dashboard
 * 医院智慧资产看板（管理驾驶舱，仅 admin）。
 * query: period（可选，报告窗口标签，默认 month）
 */
async function handleWisdomDashboard(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const hospitalId = currentHospitalId();
    const period = (c.query.get('period') ?? 'month').trim() || 'month';
    const nowIso = new Date().toISOString();

    const demoMode = demoModeEnabled();
    const usingDemo = demoMode || !hasLiveSamples();

    const input = usingDemo && demoMode ? demoInput() : live;
    const history =
      usingDemo && demoMode
        ? demoHistory()
        : historyBuffer.slice(-HISTORY_CAP);

    const dashboard = buildHospitalWisdomDashboard(hospitalId, input, nowIso);
    const report = getWisdomGrowthReport(hospitalId, period, history, nowIso);

    // 无真实样本时强制 demo 标记，绝不以内存零值冒充真实结论
    const demo = usingDemo;

    return json(ok({ dashboard, report, demo }, 'ok', c.traceId));
  } catch (err) {
    const message = err instanceof Error ? err.message : '智慧资产看板采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const wisdomDashboardRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/wisdom/dashboard',
    auth: true,
    handle: handleWisdomDashboard,
  },
];
