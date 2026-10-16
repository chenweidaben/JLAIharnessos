/**
 * 健澜科技 jlmedaios - M170-A 医院自学习闭环深化 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/auto-learn/deep
 *  - 返回本周期四维度深度自学习报告：
 *      诊断准确率学习 / 用药合理性学习 / 护理风险学习 / 管理决策学习；
 *    含维度权重自动调整留痕、知识漂移检测、交叉验证结果与成熟度评分；
 *  - 【本切片边界】纯函数 + 路由 + 前端，不写 SQL、无新表；
 *    样本由进程内确定性演示数据驱动，真实接入后仅替换数据来源，纯函数签名不变；
 *  - 【远期路线图】事件流接入后，权重/阈值进化结果自动回流推荐中台，
 *    形成「反馈→权重→排序→再反馈」的日级自动进化调度。
 *
 * 医疗安全：仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、
 *   无写副作用；仅返回聚合统计，不含患者 PII。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  generateEvolutionReport,
  type DeepFeedbackData,
} from '../aggregators/autoLearnDeepAggregator';

/** 演示模式开关：与 adminHealth / autoLearn 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/**
 * 构造本周期确定性演示样本：
 *   - diagnosis：初诊命中率高（9/10）→ 诊断维度升权；
 *   - medication：合理率偏低、错误集中在 interaction → 用药维度降权 + 重训；
 *   - nursing：漏报多（3/10 未预警）→ 护理阈值自动下调；
 *   - management：成功率约 60% → 观望区间，权重 hold。
 */
function buildCurrentFeedback(): DeepFeedbackData {
  const diagnosis = Array.from({ length: 10 }, (_, i) => ({
    encounterId: `ENC-${i}`,
    suggestedDiagnosis: i < 9 ? 'J18.9' : 'J44.9',
    finalDiagnosis: 'J18.9',
    correct: i < 9,
    delayedDays: i === 8 ? 2 : i < 9 ? 0 : 4,
  }));

  const medication = Array.from({ length: 12 }, (_, i) => ({
    prescriptionId: `RX-${i}`,
    judgement: (i < 5 ? 'appropriate' : i < 8 ? 'suboptimal' : 'wrong') as
      | 'appropriate'
      | 'suboptimal'
      | 'wrong',
    issueType: (i < 5 ? undefined : i < 8 ? 'dose' : i < 10 ? 'interaction' : 'interaction') as
      | 'dose'
      | 'interaction'
      | 'indication'
      | 'duplication'
      | undefined,
  }));

  const nursing = Array.from({ length: 10 }, (_, i) => ({
    eventId: `AE-${i}`,
    riskType: (i < 4 ? 'fall' : i < 7 ? 'pressure_ulcer' : 'medication_error') as
      | 'fall'
      | 'pressure_ulcer'
      | 'medication_error'
      | 'infection'
      | 'other',
    // 前 7 起被预警，后 3 起漏报 → sensitivity 0.7，低于 0.8 目标，阈值下调
    warned: i < 7,
    severity: (i < 3 ? 'low' : i < 8 ? 'medium' : 'high') as 'low' | 'medium' | 'high',
  }));

  const management = [
    { decisionId: 'MD-1', domain: 'bed_allocation' as const, outcome: 'success' as const, impact: 0.2 },
    { decisionId: 'MD-2', domain: 'staffing' as const, outcome: 'success' as const, impact: 0.15 },
    { decisionId: 'MD-3', domain: 'schedule' as const, outcome: 'partial' as const, impact: 0.05 },
    { decisionId: 'MD-4', domain: 'procurement' as const, outcome: 'failure' as const, impact: -0.25 },
    { decisionId: 'MD-5', domain: 'bed_allocation' as const, outcome: 'success' as const, impact: 0.1 },
    { decisionId: 'MD-6', domain: 'staffing' as const, outcome: 'partial' as const, impact: 0.0 },
  ];

  return { diagnosis, medication, nursing, management };
}

/**
 * 构造上一周期样本：用药合理率明显更高、护理敏感性更高，
 * 用于触发「知识漂移」告警——本周期用药/护理指标下滑。
 */
function buildPreviousFeedback(): DeepFeedbackData {
  const diagnosis = Array.from({ length: 10 }, (_, i) => ({
    encounterId: `PRE-ENC-${i}`,
    suggestedDiagnosis: 'J18.9',
    finalDiagnosis: 'J18.9',
    correct: true,
    delayedDays: 0,
  }));
  const medication = Array.from({ length: 12 }, (_, i) => ({
    prescriptionId: `PRE-RX-${i}`,
    judgement: (i < 10 ? 'appropriate' : 'suboptimal') as 'appropriate' | 'suboptimal' | 'wrong',
    issueType: undefined as 'dose' | 'interaction' | 'indication' | 'duplication' | undefined,
  }));
  const nursing = Array.from({ length: 10 }, (_, i) => ({
    eventId: `PRE-AE-${i}`,
    riskType: 'fall' as const,
    warned: true,
    severity: 'low' as const,
  }));
  const management = Array.from({ length: 6 }, (_, i) => ({
    decisionId: `PRE-MD-${i}`,
    domain: 'bed_allocation' as const,
    outcome: 'success' as const,
    impact: 0.2,
  }));
  return { diagnosis, medication, nursing, management };
}

/**
 * GET /api/v1/admin/auto-learn/deep
 * 四维度深度自学习进化报告（管理驾驶舱，仅 admin）。
 * query: days（可选，窗口天数，默认 7）
 */
async function handleAutoLearnDeep(c: Ctx): Promise<Response> {
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const days = Number(c.query.get('days') ?? '7');
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 365) : 7;

    const demo = demoModeEnabled();
    // 【本切片边界】无新表：演示样本驱动真实纯函数折算；
    // 【远期路线图】替换为事件流查询后即真实闭环。
    const report = generateEvolutionReport({
      days: safeDays,
      feedback: buildCurrentFeedback(),
      previous: buildPreviousFeedback(),
      generatedAt: new Date().toISOString(),
    });

    return json(
      ok({
        ...report,
        demo,
        notice: demo
          ? '演示模式：样本为确定性演示数据；接入反馈事件流后报告自动切换为真实闭环数据'
          : undefined,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '深度自学习报告生成失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const autoLearnDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/auto-learn/deep',
    auth: true,
    handle: handleAutoLearnDeep,
  },
];
