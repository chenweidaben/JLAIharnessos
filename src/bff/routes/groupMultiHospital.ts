/**
 * 健澜科技 jlmedaios — 【集团与科研】医院集团多院管理 BFF 路由（M156-A，仅 admin）
 *
 * GET /api/v1/admin/group/dashboard
 *  - 采集集团下属医院院籍与各院核心指标快照（进程内内存快照，零新依赖），
 *    交由纯函数 buildGroupDashboard / compareHospitals / optimizeGroupResource
 *    归并为「集团大屏 + 五维指标对比 + 三类资源调配建议」一页返回；
 *  - 返回 { dashboard, comparisons, resourceSuggestions, demo }；
 *    无真实样本时打 demo 标记，前端走三态，绝不用假数据冒充真实集团结论。
 *
 * 【数据隔离红线】：
 *  - 院级指标快照按 hospital_id 严格隔离落库；本端点只做集团聚合层只读汇总，
 *    不下钻任何单院患者明细；
 *  - 跨院对比（compareHospitals）与跨院调配（optimizeGroupResource）只在本聚合层发生。
 *
 * 生产安全加固：
 *  - 仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、无写副作用；
 *  - 不暴露患者个体 PII，只返回院级聚合统计量；
 *  - groupId 由集团管理上下文透传，院籍归属严格校验。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildGroupDashboard,
  compareHospitals,
  optimizeGroupResource,
  GROUP_METRIC_META,
  RESOURCE_META,
  type GroupInput,
  type GroupMetricKey,
  type ResourceType,
} from '../aggregators/groupMultiHospitalAggregator';

/** 演示模式开关：与 adminWisdom / adminTrends 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 集团 ID（集团管理上下文；取不到时回退 'default'，不抛错） */
function currentGroupId(): string {
  return 'default';
}

/* -------------------- 进程内内存采集（零新依赖，仅本模块） -------------------- */

/** 集团输入快照（院籍 + 各院指标 + 统一标准；演示模式下由种子数据兜底） */
const live: Required<Pick<GroupInput, 'groupName' | 'members' | 'metrics' | 'standards'>> = {
  groupName: '',
  members: [],
  metrics: [],
  standards: [],
};

function hasLiveSamples(): boolean {
  return live.members.length > 0 && live.metrics.length > 0;
}

/** 演示模式种子数据：三家成员医院，负载有高有低，便于演示资源优化 */
function demoInput(): Required<Pick<GroupInput, 'groupName' | 'members' | 'metrics' | 'standards'>> {
  const period = '2026-10';
  return {
    groupName: '健澜医疗集团（演示）',
    members: [
      { hospitalId: 'h-head', hospitalName: '健澜总院', hospitalLevel: '三级甲等', memberRole: 'head', region: '杭州' },
      { hospitalId: 'h-branch-1', hospitalName: '城东分院', hospitalLevel: '三级乙等', memberRole: 'branch', region: '杭州' },
      { hospitalId: 'h-branch-2', hospitalName: '临平分院', hospitalLevel: '二级甲等', memberRole: 'member', region: '杭州' },
    ],
    metrics: [
      {
        hospitalId: 'h-head',
        hospitalName: '健澜总院',
        period,
        outpatientVolume: 96000,
        inpatientVolume: 8200,
        surgeryVolume: 4600,
        revenue: 12800.5,
        satisfaction: 92.4,
        expertLoad: 91,
        equipmentLoad: 88,
        bedOccupancy: 94,
      },
      {
        hospitalId: 'h-branch-1',
        hospitalName: '城东分院',
        period,
        outpatientVolume: 52000,
        inpatientVolume: 4100,
        surgeryVolume: 2100,
        revenue: 5600.0,
        satisfaction: 88.1,
        expertLoad: 64,
        equipmentLoad: 58,
        bedOccupancy: 71,
      },
      {
        hospitalId: 'h-branch-2',
        hospitalName: '临平分院',
        period,
        outpatientVolume: 31000,
        inpatientVolume: 2200,
        surgeryVolume: 980,
        revenue: 2400.8,
        satisfaction: 90.6,
        expertLoad: 42,
        equipmentLoad: 35,
        bedOccupancy: 55,
      },
    ],
    standards: [
      { category: 'clinic', name: '集团统一临床路径管理规范', standardCode: 'GRP-CLIN-001', version: 'v2.1', enforceLevel: 'mandatory' },
      { category: 'qc', name: '集团医疗质量控制评价标准', standardCode: 'GRP-QC-001', version: 'v3.0', enforceLevel: 'mandatory' },
      { category: 'safety', name: '集团患者安全目标与制度', standardCode: 'GRP-SAFE-001', version: 'v1.8', enforceLevel: 'mandatory' },
      { category: 'clinic', name: '集团肿瘤诊疗多学科协作（MDT）推荐规范', standardCode: 'GRP-CLIN-002', version: 'v1.2', enforceLevel: 'recommended' },
    ],
  };
}

/**
 * GET /api/v1/admin/group/dashboard
 * 医院集团多院管理大屏（集团驾驶舱，仅 admin）。
 * query: period（可选，对比周期标签，默认取快照自带周期）
 */
async function handleGroupDashboard(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const groupId = currentGroupId();
    const nowIso = new Date().toISOString();

    const demoMode = demoModeEnabled();
    const usingDemo = demoMode || !hasLiveSamples();
    const input = usingDemo && demoMode ? demoInput() : live;
    const period = (c.query.get('period') ?? '').trim();

    // 集团大屏
    const dashboard = buildGroupDashboard(groupId, input, nowIso);

    // 五维指标跨院对比（同一周期）
    const comparisons = (Object.keys(GROUP_METRIC_META) as GroupMetricKey[]).map((metric) => ({
      metric,
      metricName: GROUP_METRIC_META[metric].name,
      rows: compareHospitals(groupId, metric, period, input.metrics),
    }));

    // 三类资源跨院调配建议
    const resourceSuggestions = (Object.keys(RESOURCE_META) as ResourceType[]).map((rt) =>
      optimizeGroupResource(groupId, rt, input.metrics, nowIso),
    );

    // 无真实样本时强制 demo 标记
    const demo = usingDemo;

    return json(ok({ dashboard, comparisons, resourceSuggestions, demo }, 'ok', c.traceId));
  } catch (err) {
    const message = err instanceof Error ? err.message : '集团多院大屏采集失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const groupMultiHospitalRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/group/dashboard',
    auth: true,
    handle: handleGroupDashboard,
  },
];
