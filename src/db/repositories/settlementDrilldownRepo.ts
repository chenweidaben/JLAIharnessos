/**
 * 健澜科技 jlmedaios - 结算下钻 repo（M23-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { getDb } from '../pool.js';
import type { PeriodCase } from '../../medical-tools/operations/settlementDrilldown.js';

const db = getDb();

/**
 * 取周期内病例的科室/主治/结算/超支。纯读，复用 payment_group_selection + visits + inpatient_cost_monitor。
 * 本切片不联 billing 类别表（避免跨模块破坏），drugCost/totalCost 以 settlement 占位保证药占比字段存在。
 */
export async function listPeriodCases(_period: string): Promise<PeriodCase[]> {
  const rows = await db`
    SELECT ps.visit_id AS visit_id,
           COALESCE(v.department, 'unknown') AS department,
           COALESCE(v.attending_doctor_id::text, ps.visit_id::text) AS doctor_id,
           COALESCE(ps.drg_expected_payment, 0) + COALESCE(ps.dip_payment, 0) AS settlement,
           (COALESCE(icm.level, 'ok') <> 'ok') AS overspend
    FROM clinical.payment_group_selection ps
    LEFT JOIN clinical.visits v ON v.id = ps.visit_id
    LEFT JOIN clinical.inpatient_cost_monitor icm ON icm.visit_id = ps.visit_id
    WHERE ps.visit_id IS NOT NULL`;
  return rows.map((r: Record<string, unknown>) => {
    const settlement = Number(r.settlement ?? 0);
    return {
      department: String(r.department ?? 'unknown'),
      doctorId: String(r.doctor_id ?? ''),
      settlement,
      overspend: Boolean(r.overspend),
      drugCost: 0,
      totalCost: settlement,
    };
  });
}
