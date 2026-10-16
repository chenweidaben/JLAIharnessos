/**
 * 健澜科技 jlmedaios — M173-A 测试覆盖率缺口 BFF 路由（99% → 99.5%+）
 *
 * 【质量提升与新场景】
 *
 * GET /api/v1/admin/test/coverage-gap（仅 admin，依据宪法第三章）
 *
 * 行为约定：
 *  - 编排三个纯函数：identifyRemainingCoverageGaps → generateCoverageImprovementPlan
 *    → trackCoverageProgress；
 *  - query 参数可选：
 *      · current（当前行率，如 0.99；越界 / NaN 由纯函数 clamp）；
 *      · target（目标行率，如 0.995；低于 current 自动翻转）；
 *      · totalLines（考核总行数，默认 500000；非正回退基线）；
 *  - 仅 admin 角色可访问：未登录 401，非 admin 403；
 *  - 不发起任何真实 HTTP / DB 请求，纯确定性运算，无写副作用。
 *
 * 用途：发版 / CI 期把覆盖率从 99% 推向 99.5%+，前端缺口页
 *   （web/src/pages/admin/CoverageGap/index.tsx）直读本接口。
 *
 * 生产安全加固：
 *  - 只读端点，零写操作；
 *  - 不暴露患者 PII，仅工程指标；
 *  - 不碰 WebSocket、不新增依赖、不写 SQL。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  generateCoverageImprovementPlan,
  identifyRemainingCoverageGaps,
  trackCoverageProgress,
} from '../aggregators/coverageGapAggregator';

/** 解析数值 query：缺省 / 非法返回 null，由纯函数决定回退 */
function parseNum(raw: string | null): number | null {
  if (raw === null) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

/**
 * GET /api/v1/admin/test/coverage-gap
 * 覆盖率缺口识别 + 提升计划 + 进度跟踪（管理驾驶舱，仅 admin）。
 */
async function handleCoverageGap(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const current = parseNum(c.query.get('current'));
    const target = parseNum(c.query.get('target'));
    const totalLines = parseNum(c.query.get('totalLines'));

    const gaps = identifyRemainingCoverageGaps({
      generatedAt: new Date().toISOString(),
      ...(current === null ? {} : { currentRate: current }),
      ...(target === null ? {} : { targetRate: target }),
      ...(totalLines === null ? {} : { totalLines }),
    });

    const plan = generateCoverageImprovementPlan(gaps);

    // 本切片为只读报告端点：无外部持久化进度，snapshot 缺省 → not_started
    const progress = trackCoverageProgress(plan, null);

    return json(
      ok({ gaps, plan, progress }, 'ok', c.traceId),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '覆盖率缺口计算失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const coverageGapRoutes: RouteDef[] = [
  {
    // M173-A：99% → 99.5%+ 覆盖率冲刺闭环（仅 admin，质量门禁）
    method: 'GET',
    path: '/api/v1/admin/test/coverage-gap',
    auth: true,
    handle: handleCoverageGap,
  },
];
