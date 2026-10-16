/**
 * 健澜科技 jlmedaios — 【质量与新场景】AI 医院大脑 · 深度智能预警路由（M175-B）
 *
 * GET /api/v1/ai-brain/deep-alert
 *   - 拉取院级实时信号快照（进程内内存，零新依赖），交纯函数：
 *       buildDeepAIAlert  按 12 类阈值目录评估成结构化预警（证据链）；
 *       prioritizeAIAlert  按 严重度×类别权重×偏离度 做优先级排序；
 *       generateAIAlertAction  逐条生成可落地处置（措施/责任岗/SLA/量化目标）；
 *   - 返回 { alerts, actions, system, criticalCount, demo, notice }。
 *     预警「真有用」：每条带证据与处置，不是一句「建议关注」。
 *
 * 生产安全加固：
 *  - 登录即可读（auth=true），只读、无写副作用、不写 SQL、不碰 WebSocket；
 *  - 预警全部来自阈值目录白名单，未登记信号不参与，禁止自创预警；
 *  - 仅院级聚合量，不含患者 PII；预警为管理辅助，不替代临床/院感流调。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  buildDeepAIAlert,
  generateAIAlertAction,
  prioritizeAIAlert,
  type AlertSignal,
} from '../aggregators/deepAIAlertAggregator';

/** 演示模式开关：与 wisdomDashboard / talentDeep 一致 */
function demoModeEnabled(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/* -------------------- 进程内内存信号采集（零新依赖，仅本模块） -------------------- */

/**
 * 院级实时信号快照（真实部署由 HIS/EMR/CPOE/手麻/院感/医保/财务数据平台回写）。
 * 刻意覆盖四大类、含越线与未越线样本，用于演示预警判定。
 */
const liveSignals: AlertSignal[] = [
  // 医疗质量
  { code: 'MED_RECORD_DEFECT_RATE', current: 7.8 },
  { code: 'MED_PRESCRIPTION_IRRATIONAL_RATE', current: 2.1 },
  { code: 'MED_SURGICAL_COMPLICATION_RATE', current: 4.6 },
  // 运营效率
  { code: 'OPS_BED_OCCUPANCY', current: 97.4 },
  { code: 'OPS_OUTPATIENT_WAIT_MIN', current: 52 },
  { code: 'OPS_KEY_DRUG_SHORTAGE_DAYS', current: 5 },
  // 安全合规
  { code: 'SAF_HAI_CLUSTER_7D', current: 4 },
  { code: 'SAF_KEY_EQUIP_DOWN_HOURS', current: 6.5 },
  { code: 'SAF_SYSTEM_AVAILABILITY', current: 99.62 },
  // 财务经营
  { code: 'FIN_DRG_OVERRUN_RATE', current: 11.2 },
  { code: 'FIN_INSURANCE_REJECT_RATE', current: 1.4 },
  { code: 'FIN_COST_OVER_BUDGET_RATE', current: 7.3 },
];

/**
 * GET /api/v1/ai-brain/deep-alert
 * AI 医院大脑 · 深度智能预警（登录可读）。
 */
async function handleDeepAIAlert(c: Ctx): Promise<Response> {
  try {
    const nowIso = new Date().toISOString();

    // 1) 信号 → 结构化预警（证据链 + 初始优先级分）
    const system = buildDeepAIAlert(liveSignals, nowIso);

    // 2) 优先级排序（不改原数组）
    const alerts = prioritizeAIAlert(system.alerts);

    // 3) 逐条生成可落地处置建议
    const actions = alerts.map((a) => generateAIAlertAction(a));

    const demo = demoModeEnabled() || liveSignals.length === 0;

    return json(
      ok(
        {
          alerts,
          actions,
          summary: system.summary,
          criticalCount: system.criticalCount,
          generatedAt: system.generatedAt,
          demo,
          notice: demo
            ? '演示数据，仅用于预警体系与科研建模演示，不代表真实运行数据；预警为管理辅助，不替代临床诊疗与院感流调。'
            : 'AI 深度预警，仅为管理辅助。',
        },
        'ok',
        c.traceId,
      ),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'AI 深度预警生成失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const deepAIAlertRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/ai-brain/deep-alert',
    auth: true,
    handle: handleDeepAIAlert,
  },
];
