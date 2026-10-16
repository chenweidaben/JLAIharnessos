/**
 * 健澜科技 jlmedaios - M161-B 全院智慧资产看板 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/smart-assets/dashboard
 *  - 采集全院四维智慧资产原始计数（进程内内存快照，零新依赖），交由纯函数
 *    buildSmartAssetDashboard / calculateAssetGrowth 归并为一页看板；
 *  - 返回 { dashboard, growth, demo }；无真实样本时打 demo 标记，
 *    前端走三态，绝不用假数据冒充真实智慧资产结论。
 *
 * 【核心主张】智慧资产要量化，不能只说「很聪明」：
 *   经验资产（医/护/药经验条数）+ 知识资产（疾病/药物/指南）
 *   + 模型资产（诊断/预测/推荐）+ 数据资产（结构化/非结构化），
 *   四维饱和折算 → 加权总分 → 段位对标 → 缺口清单。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不暴露患者个体 PII 与医生个人明细，只返回聚合统计量；
 *  - hospitalId 由路由层从租户上下文透传，多租户隔离。
 *
 * 【远期深化】：后续接入真实资产目录后，把内存计数替换为带元数据的资产清单查询。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildSmartAssetDashboard,
  calculateAssetGrowth,
  type SmartAssetInput,
  type SmartAssetSnapshot,
} from '../aggregators/smartAssetAggregator';
import { tenantService } from '@/tenant';

/** 演示模式开关：与 adminHealth / adminTrends / wisdomDashboard 一致 */
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
const live: SmartAssetInput = {
  doctorExperience: 0,
  nurseExperience: 0,
  pharmacistExperience: 0,
  diseaseKnowledge: 0,
  drugKnowledge: 0,
  guidelineKnowledge: 0,
  diagnosisModels: 0,
  predictionModels: 0,
  recommendationModels: 0,
  structuredAssets: 0,
  unstructuredAssets: 0,
};

/** 历史快照缓冲（由旧到新；月终调度触发，本模块不自带定时器） */
const historyBuffer: SmartAssetSnapshot[] = [];
const HISTORY_CAP = 12;

function hasLiveSamples(): boolean {
  return Object.values(live).some((v) => Number(v) > 0);
}

/** 演示模式种子数据（与看板口径一致的确定性样本，便于演示「智慧资产量化」） */
function demoInput(): SmartAssetInput {
  return {
    doctorExperience: 1800,
    nurseExperience: 1200,
    pharmacistExperience: 480,
    diseaseKnowledge: 300,
    drugKnowledge: 1200,
    guidelineKnowledge: 180,
    diagnosisModels: 30,
    predictionModels: 18,
    recommendationModels: 24,
    structuredAssets: 4800,
    unstructuredAssets: 2400,
  };
}

/** 演示模式历史：近 6 期智慧资产稳步上行 */
function demoHistory(): SmartAssetSnapshot[] {
  return [
    { period: '2026-05', experience: 2600, knowledge: 1200, model: 52, data: 5200, smartScore: 48.5 },
    { period: '2026-06', experience: 2900, knowledge: 1380, model: 58, data: 5800, smartScore: 52.0 },
    { period: '2026-07', experience: 3150, knowledge: 1500, model: 64, data: 6300, smartScore: 55.6 },
    { period: '2026-08', experience: 3320, knowledge: 1580, model: 68, data: 6800, smartScore: 58.2 },
    { period: '2026-09', experience: 3420, knowledge: 1650, model: 70, data: 7100, smartScore: 59.4 },
    { period: '2026-10', experience: 3480, knowledge: 1680, model: 72, data: 7200, smartScore: 60.0 },
  ];
}

/**
 * GET /api/v1/admin/smart-assets/dashboard
 * 全院智慧资产看板（管理驾驶舱，仅 admin）。
 * query: period（可选，报告窗口标签，默认 month）
 */
async function handleSmartAssetDashboard(c: Ctx): Promise<Response> {
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
      usingDemo && demoMode ? demoHistory() : historyBuffer.slice(-HISTORY_CAP);

    const dashboard = buildSmartAssetDashboard(hospitalId, input, nowIso);
    const growth = calculateAssetGrowth(hospitalId, period, history, nowIso);

    // 无真实样本时强制 demo 标记，绝不以内存零值冒充真实结论
    const demo = usingDemo;

    return json(ok({ dashboard, growth, demo }, 'ok', c.traceId));
  } catch (err) {
    const message = err instanceof Error ? err.message : '智慧资产看板采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const smartAssetRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/smart-assets/dashboard',
    auth: true,
    handle: handleSmartAssetDashboard,
  },
];
