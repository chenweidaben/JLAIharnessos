/**
 * 健澜科技 jlmedaios - M160-A 全自学习闭环 BFF 路由（管理驾驶舱，仅 admin）
 *
 * GET /api/v1/admin/auto-learn/report
 *  - 返回本周（默认 7 天）系统自动进化报告：推荐权重调整、服务流程优化、
 *    安全规则升级、质控薄弱环节强化 + 知识缺口诊断；
 *  - 【本切片边界】纯函数 + 路由 + 前端，不写 SQL、无新表；
 *    事件样本由进程内确定性数据驱动（demo=true 时为演示样本），
 *    真实接入后仅替换事件来源，纯函数签名不变；
 *  - 【远期路线图】事件流接入 medmuse.feedback_event_stream 后，
 *    权重进化结果自动回流推荐中台，实现周级自动进化、零人工调参。
 *
 * 医疗安全：仅 admin 角色（requireRole 内部已处理 401/403），本端点只读、
 *   无写副作用；仅返回聚合统计，不含患者 PII。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  generateLearningReport,
  type FeedbackEvent,
  type WeightMap,
} from '../aggregators/autoLearnAggregator';

/** 演示模式开关：与 adminHealth / adminIntelligenceScore 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/**
 * 构造一份确定性的周度反馈样本（演示用）。
 * 数据经过真实纯函数折算，权重/缺口都是「真算出来的」，不是静态摆拍：
 *   - drug 类建议被医生反复采纳 → 升权；
 *   - lab_interpret 类建议被反复拒绝 → 降权 + 知识缺口；
 *   - charging 环节满意度偏低 → 触发流程优化；
 *   - drug_interaction_check 出现高危差错 → 规则升级为 block；
 *   - 病案质控累计扣分 → 强化 L2。
 */
function buildDemoWeekEvents(): FeedbackEvent[] {
  const events: FeedbackEvent[] = [];
  // 医生决策通道：drug 高采纳、lab_interpret 高拒绝、diagnosis 观望
  for (let i = 0; i < 9; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'drug', doctorDecision: 'adopted' });
  }
  events.push({ kind: 'doctor_decision', suggestionType: 'drug', doctorDecision: 'rejected' });
  for (let i = 0; i < 2; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'lab_interpret', doctorDecision: 'adopted' });
  }
  for (let i = 0; i < 8; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'lab_interpret', doctorDecision: 'rejected' });
  }
  for (let i = 0; i < 4; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'diagnosis', doctorDecision: 'adopted' });
  }
  for (let i = 0; i < 6; i += 1) {
    events.push({ kind: 'doctor_decision', suggestionType: 'diagnosis', doctorDecision: 'rejected' });
  }
  // 患者满意度通道：charging 偏低，registration 合格
  for (const score of [3.2, 3.5, 3.1, 3.4]) {
    events.push({ kind: 'patient_satisfaction', serviceStage: 'charging', satisfactionScore: score });
  }
  for (const score of [4.5, 4.6, 4.4]) {
    events.push({ kind: 'patient_satisfaction', serviceStage: 'registration', satisfactionScore: score });
  }
  // 医疗差错通道：drug_interaction_check 1 起高危
  events.push({ kind: 'medical_error', safetyRule: 'drug_interaction_check', severity: 'high' });
  events.push({ kind: 'medical_error', safetyRule: 'drug_interaction_check', severity: 'low' });
  // 质控通道：病案扣分
  events.push({ kind: 'qc_deduction', qcDimension: '病案首页', deductionPoints: 3 });
  events.push({ kind: 'qc_deduction', qcDimension: '病案首页', deductionPoints: 4 });
  events.push({ kind: 'qc_deduction', qcDimension: '护理记录', deductionPoints: 2 });
  return events;
}

/** 演示用当前权重分布（与推荐中台缺省权重对齐） */
function demoCurrentWeights(): WeightMap {
  return { diagnosis: 1.0, drug: 1.0, pathway: 1.0, lab_interpret: 1.0 };
}

/**
 * GET /api/v1/admin/auto-learn/report
 * 全自学习闭环周度报告（管理驾驶舱，仅 admin）。
 * query: days（可选，窗口天数，默认 7）
 */
async function handleAutoLearnReport(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const days = Number(c.query.get('days') ?? '7');
    const safeDays = Number.isFinite(days) && days > 0 ? Math.min(Math.floor(days), 365) : 7;

    const demo = demoModeEnabled();
    // 【本切片边界】无新表：演示样本驱动真实纯函数折算；
    // 【远期路线图】替换为 feedback_event_stream 查询后即真实闭环。
    const events = buildDemoWeekEvents();
    const report = generateLearningReport({
      days: safeDays,
      events,
      currentWeights: demoCurrentWeights(),
      generatedAt: new Date().toISOString(),
    });

    return json(
      ok({
        ...report,
        demo,
        notice: demo
          ? '演示模式：反馈样本为确定性演示数据；接入 feedback_event_stream 后报告自动切换为真实闭环数据'
          : undefined,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '自学习报告生成失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const autoLearnRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/auto-learn/report',
    auth: true,
    handle: handleAutoLearnReport,
  },
];
