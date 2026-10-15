/**
 * 健澜科技 jlmedaios - 医院感染实时监测 BFF 路由（M153-C，临床决策支持）
 *
 * GET /api/v1/admin/infection/realtime（仅 admin 角色可读）
 *  - 实时返回各科室四大院感指标率：手术部位感染率 SSI / 导管相关血流感染率 CLABSI
 *    / 呼吸机相关肺炎率 VAP / 多重耐药菌检出率 MDRO；
 *  - 【核心业务深化】超阈值即触发红色暴发预警（redAlert=true），不等月报、不等季度汇总；
 *  - 指标率计算 / 暴发识别 / 预警生成全部下沉到纯函数
 *    monitorInfectionRates / detectOutbreak / generateInfectionAlert，
 *    本路由只做鉴权与数据装配；
 *  - 当前接入进程级近实时种子数据（灰度/演示，后续平滑替换为
 *    HIS 手术麻醉 / LIS 微生物 / 护理院感上报系统的实时聚合，函数签名不变）。
 *
 * 医疗安全：仅 admin 角色（requireRole 内部处理 401/403），只读、无写副作用；
 * 不暴露患者身份明细（仅科室聚合率），不触碰 WebSocket。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireRole } from '../middleware/auth.js';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types.js';
import {
  CLABSI_UNIT,
  INFECTION_TYPE_LABEL,
  MDRO_UNIT,
  monitorInfectionRates,
  detectOutbreak,
  generateInfectionAlert,
  SSI_UNIT,
  VAP_UNIT,
  type DeptInfectionInput,
  type InfectionAlert,
  type InfectionType,
  type InfectionRate,
  type OutbreakResult,
} from '../aggregators/infectionRealtimeAggregator.js';

/** 各指标暴发阈值（例）——导出便于前端展示与审计 */
const OUTBREAK_THRESHOLD: Record<InfectionType, number> = {
  ssi: 3,
  clabsi: 2,
  vap: 2,
  mdro: 5,
};

/** 各指标率值单位 */
const RATE_UNIT: Record<InfectionType, '%' | '‰'> = {
  ssi: SSI_UNIT,
  clabsi: CLABSI_UNIT,
  vap: VAP_UNIT,
  mdro: MDRO_UNIT,
};

/**
 * 管理驾驶舱种子数据：各科室本期实时分子/分母计数（演示/灰度，后续接业务库实时聚合）。
 * 不含患者身份信息，仅科室聚合口径。
 */
const SEED_DEPTS: DeptInfectionInput[] = [
  // 重症医学科：CLABSI 3 例（阈值 2）+ VAP 4 例（阈值 2）→ 双红色暴发预警
  {
    deptCode: 'D-ICU',
    deptName: '重症医学科',
    surgeryCount: 20,
    ssiCases: 1,
    centralLineDays: 120,
    clabsiCases: 3,
    ventDays: 200,
    vapCases: 4,
    totalCultures: 60,
    mdroDetections: 4,
  },
  // 普外科：SSI 5 例（阈值 3）→ 红色暴发预警
  {
    deptCode: 'D-SURG',
    deptName: '普外科',
    surgeryCount: 80,
    ssiCases: 5,
    centralLineDays: 40,
    clabsiCases: 0,
    ventDays: 10,
    vapCases: 0,
    totalCultures: 30,
    mdroDetections: 2,
  },
  // 呼吸内科：MDRO 检出 9 株（阈值 5）→ 红色暴发预警
  {
    deptCode: 'D-RESP',
    deptName: '呼吸内科',
    surgeryCount: 0,
    ssiCases: 0,
    centralLineDays: 30,
    clabsiCases: 1,
    ventDays: 40,
    vapCases: 1,
    totalCultures: 120,
    mdroDetections: 9,
  },
  // 普通内科：各指标均低于阈值 → 绿色正常
  {
    deptCode: 'D-GEN',
    deptName: '普通内科',
    surgeryCount: 12,
    ssiCases: 0,
    centralLineDays: 25,
    clabsiCases: 0,
    ventDays: 8,
    vapCases: 0,
    totalCultures: 45,
    mdroDetections: 1,
  },
];

/** 各指标对应分子字段名（用于从 DeptInfectionInput 取实测例数） */
const CASES_FIELD: Record<InfectionType, keyof DeptInfectionInput> = {
  ssi: 'ssiCases',
  clabsi: 'clabsiCases',
  vap: 'vapCases',
  mdro: 'mdroDetections',
};

/** 各指标对应率值字段名（用于从 InfectionRate 取率值） */
const RATE_FIELD: Record<InfectionType, keyof Pick<InfectionRate, 'ssiRate' | 'clabsiRate' | 'vapRate' | 'mdroRate'>> = {
  ssi: 'ssiRate',
  clabsi: 'clabsiRate',
  vap: 'vapRate',
  mdro: 'mdroRate',
};

const TYPE_ORDER: InfectionType[] = ['ssi', 'clabsi', 'vap', 'mdro'];

/**
 * GET /api/v1/admin/infection/realtime
 * 院感实时监测大屏数据：四大指标率 + 超阈值红色暴发预警（仅 admin）。
 */
async function handleInfectionRealtime(c: Ctx): Promise<Response> {
  // 仅 admin 角色（requireRole 内部已处理 401 / 403）
  const denied = requireRole(c, 'admin');
  if (denied) return denied;

  try {
    const period = new Date().toISOString().slice(0, 10);

    // 1) 实时计算各科室四大指标率
    const rates: InfectionRate[] = SEED_DEPTS.map((d) => monitorInfectionRates(d, period));

    // 2) 逐科室 × 逐指标做暴发识别（超阈值即触发，不等月报）
    const outbreaks: OutbreakResult[] = [];
    const alerts: InfectionAlert[] = [];
    for (const dept of SEED_DEPTS) {
      const rate = monitorInfectionRates(dept, period);
      for (const t of TYPE_ORDER) {
        const cases = Number(dept[CASES_FIELD[t]]) || 0;
        const threshold = OUTBREAK_THRESHOLD[t];
        const result = detectOutbreak(dept, t, cases, threshold);
        outbreaks.push(result);
        // 只对 red/orange 生成预警（yellow 不打扰）
        if (result.outbreak || result.level === 'orange') {
          alerts.push(
            generateInfectionAlert({
              deptCode: dept.deptCode,
              deptName: dept.deptName,
              infectionType: t,
              period,
              cases,
              threshold,
              rateValue: Number(rate[RATE_FIELD[t]]) || 0,
              rateUnit: RATE_UNIT[t],
            }),
          );
        }
      }
    }

    // 红色预警优先排序
    alerts.sort((a, b) => Number(b.redAlert) - Number(a.redAlert) || b.cases - a.cases);

    const redAlerts = alerts.filter((a) => a.redAlert);

    return json(
      ok({
        generatedAt: new Date().toISOString(),
        period,
        thresholds: OUTBREAK_THRESHOLD,
        typeLabels: INFECTION_TYPE_LABEL,
        totalDepts: rates.length,
        redAlertCount: redAlerts.length,
        deptRates: rates,
        outbreaks,
        alerts,
      }),
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : '院感实时监测聚合失败';
    return json(fail(ErrorCode.INTERNAL_ERROR, message, c.traceId), 500);
  }
}

export const infectionRealtimeRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/infection/realtime',
    auth: true,
    handle: handleInfectionRealtime,
  },
];
