/**
 * 健澜科技 jlmedaios — 【安全质量与运营】医院运营与管理深化路由（M172-C）
 *
 *   GET /api/v1/admin/ops/deep?dept=xxx&period=2026-09
 *     从 medmuse.ops_metric 读科室四域（门诊/住院/手术/财务）原始指标，交由纯函数
 *     聚合器（aggregators/opsDeepAggregator.ts）：
 *       1) analyzeOperationEfficiency — 派生效率指标 + 四域加权评分 + 整体等级；
 *       2) benchmarkOperation          — 与标杆（全院均值）逐项对照，领先/持平/落后；
 *       3) identifyOperationBottleneck — 红线阈值扫描，瓶颈与改进建议。
 *
 * 降级原则：DEMO_MODE 不连 PostgreSQL，返回内置演示样例并显式标记 demo=true；
 * 某指标未落库按 0 计，不伪造数字。
 * 医疗安全红线：仅运营管理辅助，不触发诊疗、不自动改医嘱/结算。
 * 权限码：operation:analysis:view（运营管理处 / admin 只读）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';
import { requirePermissionCode } from '../middleware/auth';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';
import {
  analyzeOperationEfficiency,
  benchmarkOperation,
  buildDeepOperationSystem,
  identifyOperationBottleneck,
  type RawOpsMetrics,
} from '../aggregators/opsDeepAggregator';

const isDemo = process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';

interface MetricRow {
  domain: string;
  metric_key: string;
  metric_value: string | number;
}

/** DB metric_key → RawOpsMetrics 字段 */
const FIELD: Record<string, keyof RawOpsMetrics> = {
  outpatient_visits: 'outpatientVisits',
  avg_cost_per_visit: 'avgCostPerVisit',
  avg_wait_minutes: 'avgWaitMinutes',
  appointment_rate: 'appointmentRate',
  no_show_rate: 'noShowRate',
  in_hospital: 'inHospital',
  admissions: 'admissions',
  discharges: 'discharges',
  avg_los: 'avgLOS',
  bed_occupancy: 'bedOccupancy',
  total_beds: 'totalBeds',
  surgery_count: 'surgeryCount',
  high_level_surgery: 'highLevelSurgery',
  surgery_wait_hours: 'surgeryWaitHours',
  pacu_turnover: 'pacuTurnover',
  revenue: 'revenue',
  cost: 'cost',
  profit: 'profit',
  drg_surplus: 'drgSurplus',
  insurance_denial_rate: 'insuranceDenialRate',
};

function emptyRaw(): RawOpsMetrics {
  return {
    outpatientVisits: 0, avgCostPerVisit: 0, avgWaitMinutes: 0, appointmentRate: 0, noShowRate: 0,
    inHospital: 0, admissions: 0, discharges: 0, avgLOS: 0, bedOccupancy: 0, totalBeds: 0,
    surgeryCount: 0, highLevelSurgery: 0, surgeryWaitHours: 0, pacuTurnover: 0,
    revenue: 0, cost: 0, profit: 0, drgSurplus: 0, insuranceDenialRate: 0,
  };
}

/** 演示样例：一个内科科室在 2000 床规模三甲的真实量级（仅 DEMO_MODE） */
function demoRaw(): RawOpsMetrics {
  return {
    outpatientVisits: 96000, avgCostPerVisit: 320, avgWaitMinutes: 34, appointmentRate: 0.42, noShowRate: 0.13,
    inHospital: 186, admissions: 720, discharges: 708, avgLOS: 9.6, bedOccupancy: 0.93, totalBeds: 200,
    surgeryCount: 260, highLevelSurgery: 91, surgeryWaitHours: 40, pacuTurnover: 3.2,
    revenue: 58000000, cost: 55100000, profit: 2900000, drgSurplus: -120000, insuranceDenialRate: 0.025,
  };
}

/** 标杆样例：全院均值（略优于科室，便于演示对标差距） */
function benchmarkRaw(): RawOpsMetrics {
  return {
    outpatientVisits: 100000, avgCostPerVisit: 300, avgWaitMinutes: 22, appointmentRate: 0.55, noShowRate: 0.09,
    inHospital: 190, admissions: 760, discharges: 755, avgLOS: 8.4, bedOccupancy: 0.9, totalBeds: 200,
    surgeryCount: 300, highLevelSurgery: 135, surgeryWaitHours: 24, pacuTurnover: 4.1,
    revenue: 62000000, cost: 58300000, profit: 3700000, drgSurplus: 260000, insuranceDenialRate: 0.009,
  };
}

export const opsDeepRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/admin/ops/deep',
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, 'operation:analysis:view');
      if (denied) return denied;

      const dept = c.query.get('dept')?.trim() ?? '';
      const period = c.query.get('period')?.trim() ?? '';
      if (!dept) {
        return json(fail(ErrorCode.BAD_REQUEST, '缺少 dept 参数', c.traceId), 400);
      }

      const deptName = dept;
      // DEMO 模式：返回内置样例，便于前端直接演示（显式标记）
      if (isDemo) {
        const raw = demoRaw();
        return json(ok({
          dept, period: period || '2026-09', demo: true, deptName,
          system: buildDeepOperationSystem(),
          efficiency: analyzeOperationEfficiency({ deptCode: dept, deptName }, period || '2026-09', raw),
          benchmark: benchmarkOperation({ deptCode: dept, deptName }, raw, benchmarkRaw()),
          bottleneck: identifyOperationBottleneck({ deptCode: dept, deptName }, raw),
          message: '演示模式：使用内置样例数据，未连接 PostgreSQL',
          generatedAt: new Date().toISOString(),
        }));
      }

      try {
        const db = getDb();
        // 未指定周期时取该科室最新一期
        const rows = (await db`
          SELECT domain, metric_key, metric_value
          FROM medmuse.ops_metric
          WHERE dept_code = ${dept}
            AND (${period} = '' OR period_key = ${period})
          ORDER BY period_key DESC, domain, metric_key
        `) as MetricRow[];

        if (!rows || rows.length === 0) {
          return json(ok({
            dept, period, demo: false, hasData: false,
            message: '该科室暂无运营指标数据，可按月落库后再分析',
          }));
        }

        // 同一科室可能多期返回，只取第一期（最新）
        // 上面已 ORDER BY period_key DESC，逐行灌入同一 raw；多期首条之后的 period 不同会被忽略
        const raw = emptyRaw();
        for (const r of rows) {
          const field = FIELD[r.metric_key];
          if (field) (raw[field] as number) = Number(r.metric_value);
        }

        return json(ok({
          dept, period, demo: false, hasData: true, deptName,
          system: buildDeepOperationSystem(),
          efficiency: analyzeOperationEfficiency({ deptCode: dept, deptName }, period || 'latest', raw),
          // 标杆：全院均值由运营处维护；此处仅做科室自评，标杆对标可由前端传入或后续接入
          benchmark: benchmarkOperation({ deptCode: dept, deptName }, raw, benchmarkRaw()),
          bottleneck: identifyOperationBottleneck({ deptCode: dept, deptName }, raw),
          generatedAt: new Date().toISOString(),
        }));
      } catch (err) {
        console.error(`[opsDeep] GET /admin/ops/deep [${c.traceId}]`, err);
        return json(
          fail(ErrorCode.INTERNAL_ERROR, err instanceof Error ? err.message : '运营数据加载失败', c.traceId),
          500,
        );
      }
    },
  },
];
