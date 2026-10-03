/* ============================================================================
 * 健澜科技杠OS - 数据湖仓增量加工引擎（M5-D）
 *
 * 分层加工：clinical（业务）→ dwd（明细）→ dws（汇总）→ ads（指标）。
 *
 *  - DWD：基于源表 updated_at watermark 增量抽取，幂等 UPSERT；
 *  - DWS：按受影响日期重算科室日汇总（先删后插，保证一致）；
 *  - ADS：按受影响日期重算院级日指标；
 *  - 全量模式：DWD 全量重抽、DWS/ADS 全量重算。
 *
 * 一致性保证：
 *  - 每个作业在一个事务内完成（抽取/写入/登记），事务快照保证 watermark
 *    与抽取数据一致；
 *  - watermark 全程在数据库端计算与存储（timestamptz 微秒精度），不经过
 *    JS Date（毫秒精度），避免同毫秒记录被重复抽取。
 *
 * 本模块只做数据加工、不做权限/HTTP（由 lakehouseAggregator 编排）。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 * ==========================================================================*/

import { type TransactionSql, withTx } from '../db/pool.js';

export type JobCode =
  | 'dwd_visit'
  | 'dwd_fee'
  | 'dws_dept_daily'
  | 'ads_hospital_daily';

export type RunMode = 'full' | 'incremental';

export interface JobResult {
  jobCode: JobCode;
  rowsRead: number;
  rowsWritten: number;
  /** 本次变更/重算涉及的业务日期（ISO yyyy-mm-dd）。 */
  affectedDates: string[];
}

/** postgres.js 把 timestamptz 返回为 Date；统一转 ISO 字符串（null 透传）。 */
function toIso(v: unknown): string | null {
  if (v == null) return null;
  if (v instanceof Date) return v.toISOString();
  return String(v);
}

/** 上次成功 watermark 子查询（嵌入 WHERE；数据库端比较，保留微秒精度）。 */
function lastWatermarkSql(jobCode: JobCode): string {
  return `
    (SELECT watermark_to FROM meta.etl_job_runs
       WHERE job_code = '${jobCode}' AND status = 'success'
         AND watermark_to IS NOT NULL
       ORDER BY finished_at DESC LIMIT 1)`;
}

/* ------------------------------ DWD: 就诊 ------------------------------ */

async function runDwdVisit(mode: RunMode): Promise<JobResult> {
  return withTx(async (tx) => {
    const runRows = await tx`
      INSERT INTO meta.etl_job_runs (job_code, run_mode, status)
      VALUES ('dwd_visit', ${mode}, 'running')
      RETURNING run_id
    `;
    const runId = String((runRows as Record<string, unknown>[])[0].run_id);

    const selectCols = `
      id, patient_id, visit_no, visit_type, department, campus_id,
      attending_doctor_id, status, triage_level, admit_at, discharge_at,
      total_fee, updated_at`;
    const src = (mode === 'incremental'
      ? await tx.unsafe(`
          SELECT ${selectCols} FROM clinical.visits
          WHERE updated_at > ${lastWatermarkSql('dwd_visit')}
        `)
      : await tx.unsafe(`SELECT ${selectCols} FROM clinical.visits`)
    ) as Record<string, unknown>[];

    const affectedDates = new Set<string>();
    for (const r of src) {
      const admitAt = toIso(r.admit_at);
      const dischargeAt = toIso(r.discharge_at);
      const updatedAt = toIso(r.updated_at);
      const visitDate = admitAt ? admitAt.slice(0, 10) : null;
      if (visitDate) affectedDates.add(visitDate);
      await tx`
        INSERT INTO dwd.visit_detail
          (visit_id, patient_id, visit_no, visit_type, department, campus_id,
           attending_doctor_id, status, triage_level, visit_date, admit_at,
           discharge_at, total_fee, source_updated_at)
        VALUES (
          ${r.id}, ${r.patient_id}, ${r.visit_no}, ${r.visit_type},
          ${r.department}, ${r.campus_id}, ${r.attending_doctor_id},
          ${r.status}, ${r.triage_level}, ${visitDate}, ${admitAt},
          ${dischargeAt}, ${r.total_fee}, ${updatedAt}
        )
        ON CONFLICT (visit_id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          visit_no = EXCLUDED.visit_no,
          visit_type = EXCLUDED.visit_type,
          department = EXCLUDED.department,
          campus_id = EXCLUDED.campus_id,
          attending_doctor_id = EXCLUDED.attending_doctor_id,
          status = EXCLUDED.status,
          triage_level = EXCLUDED.triage_level,
          visit_date = EXCLUDED.visit_date,
          admit_at = EXCLUDED.admit_at,
          discharge_at = EXCLUDED.discharge_at,
          total_fee = EXCLUDED.total_fee,
          source_updated_at = EXCLUDED.source_updated_at,
          etl_loaded_at = now()
      `;
    }

    // 登记成功；watermark 全程数据库端（事务快照保证与抽取一致）
    await tx.unsafe(`
      UPDATE meta.etl_job_runs
      SET status = 'success',
          rows_read = ${src.length},
          rows_written = ${src.length},
          finished_at = now(),
          watermark_from = CASE
            WHEN '${mode}' = 'incremental' THEN ${lastWatermarkSql('dwd_visit')}
            ELSE NULL END,
          watermark_to = (
            SELECT max(updated_at) FROM clinical.visits
            WHERE '${mode}' = 'full'
               OR updated_at > ${lastWatermarkSql('dwd_visit')}
          )
      WHERE run_id = '${runId}'
    `);

    return {
      jobCode: 'dwd_visit',
      rowsRead: src.length,
      rowsWritten: src.length,
      affectedDates: [...affectedDates],
    };
  });
}

/* ------------------------------ DWD: 收费 ------------------------------ */

async function runDwdFee(mode: RunMode): Promise<JobResult> {
  return withTx(async (tx) => {
    const runRows = await tx`
      INSERT INTO meta.etl_job_runs (job_code, run_mode, status)
      VALUES ('dwd_fee', ${mode}, 'running')
      RETURNING run_id
    `;
    const runId = String((runRows as Record<string, unknown>[])[0].run_id);

    const selectCols = `
      id, patient_id, visit_id, department, category, item_code, item_name,
      quantity, unit_price, amount, status, source_type, created_at, updated_at`;
    const src = (mode === 'incremental'
      ? await tx.unsafe(`
          SELECT ${selectCols} FROM clinical.fee_items
          WHERE updated_at > ${lastWatermarkSql('dwd_fee')}
        `)
      : await tx.unsafe(`SELECT ${selectCols} FROM clinical.fee_items`)
    ) as Record<string, unknown>[];

    const affectedDates = new Set<string>();
    for (const r of src) {
      const createdAt = toIso(r.created_at);
      const updatedAt = toIso(r.updated_at);
      if (createdAt) affectedDates.add(createdAt.slice(0, 10));
      await tx`
        INSERT INTO dwd.fee_item_detail
          (fee_item_id, patient_id, visit_id, department, category, item_code,
           item_name, quantity, unit_price, amount, status, source_type,
           source_created_at, source_updated_at)
        VALUES (
          ${r.id}, ${r.patient_id}, ${r.visit_id}, ${r.department},
          ${r.category}, ${r.item_code}, ${r.item_name}, ${r.quantity},
          ${r.unit_price}, ${r.amount}, ${r.status}, ${r.source_type},
          ${createdAt}, ${updatedAt}
        )
        ON CONFLICT (fee_item_id) DO UPDATE SET
          patient_id = EXCLUDED.patient_id,
          visit_id = EXCLUDED.visit_id,
          department = EXCLUDED.department,
          category = EXCLUDED.category,
          item_code = EXCLUDED.item_code,
          item_name = EXCLUDED.item_name,
          quantity = EXCLUDED.quantity,
          unit_price = EXCLUDED.unit_price,
          amount = EXCLUDED.amount,
          status = EXCLUDED.status,
          source_type = EXCLUDED.source_type,
          source_created_at = EXCLUDED.source_created_at,
          source_updated_at = EXCLUDED.source_updated_at,
          etl_loaded_at = now()
      `;
    }

    await tx.unsafe(`
      UPDATE meta.etl_job_runs
      SET status = 'success',
          rows_read = ${src.length},
          rows_written = ${src.length},
          finished_at = now(),
          watermark_from = CASE
            WHEN '${mode}' = 'incremental' THEN ${lastWatermarkSql('dwd_fee')}
            ELSE NULL END,
          watermark_to = (
            SELECT max(updated_at) FROM clinical.fee_items
            WHERE '${mode}' = 'full'
               OR updated_at > ${lastWatermarkSql('dwd_fee')}
          )
      WHERE run_id = '${runId}'
    `);

    return {
      jobCode: 'dwd_fee',
      rowsRead: src.length,
      rowsWritten: src.length,
      affectedDates: [...affectedDates],
    };
  });
}

/* --------------------------- DWS: 科室日汇总 --------------------------- */

async function runDwsDept(mode: RunMode, dates: string[]): Promise<JobResult> {
  return withTx(async (tx) => {
    const runRows = await tx`
      INSERT INTO meta.etl_job_runs (job_code, run_mode, status)
      VALUES ('dws_dept_daily', ${mode}, 'running')
      RETURNING run_id
    `;
    const runId = String((runRows as Record<string, unknown>[])[0].run_id);

    if (mode === 'full') {
      await tx`TRUNCATE dws.dept_daily_summary`;
    } else {
      for (const d of dates) {
        await tx`DELETE FROM dws.dept_daily_summary WHERE stat_date = ${d}::date`;
      }
    }

    // 就诊量聚合
    const dateFilter =
      mode === 'full' ? '' : `WHERE visit_date IN ('${dates.join("','")}')`;
    const visitRows = (await tx.unsafe(`
      SELECT visit_date AS stat_date, department, visit_type,
             count(*) AS visit_count
      FROM dwd.visit_detail
      ${dateFilter}
      GROUP BY 1, 2, 3
    `)) as Record<string, unknown>[];

    // 收费聚合（join 就诊，保证口径一致）
    const feeFilter =
      mode === 'full' ? '' : `WHERE v.visit_date IN ('${dates.join("','")}')`;
    const feeRows = (await tx.unsafe(`
      SELECT v.visit_date AS stat_date, v.department, v.visit_type,
             coalesce(sum(f.amount), 0) AS fee_total
      FROM dwd.fee_item_detail f
      JOIN dwd.visit_detail v ON v.visit_id = f.visit_id
      ${feeFilter}
      GROUP BY 1, 2, 3
    `)) as Record<string, unknown>[];

    const merged = new Map<string, Record<string, unknown>>();
    const keyOf = (d: unknown, dep: unknown, vt: unknown) =>
      `${String(d)}|${String(dep)}|${String(vt)}`;
    for (const r of visitRows) {
      merged.set(keyOf(r.stat_date, r.department, r.visit_type), {
        stat_date: r.stat_date,
        department: r.department,
        visit_type: r.visit_type,
        visit_count: Number(r.visit_count),
        fee_total: 0,
      });
    }
    for (const r of feeRows) {
      const k = keyOf(r.stat_date, r.department, r.visit_type);
      const cur =
        merged.get(k) ??
        {
          stat_date: r.stat_date,
          department: r.department,
          visit_type: r.visit_type,
          visit_count: 0,
          fee_total: 0,
        };
      cur.fee_total = r.fee_total;
      merged.set(k, cur);
    }

    for (const m of merged.values()) {
      await tx`
        INSERT INTO dws.dept_daily_summary
          (stat_date, department, visit_type, visit_count, fee_total)
        VALUES (
          ${m.stat_date}::date, ${m.department}, ${m.visit_type},
          ${m.visit_count}, ${m.fee_total}
        )
        ON CONFLICT (stat_date, department, visit_type) DO UPDATE SET
          visit_count = EXCLUDED.visit_count,
          fee_total = EXCLUDED.fee_total,
          updated_at = now()
      `;
    }

    await tx`
      UPDATE meta.etl_job_runs
      SET status = 'success', rows_read = ${visitRows.length + feeRows.length},
          rows_written = ${merged.size}, finished_at = now()
      WHERE run_id = ${runId}
    `;

    return {
      jobCode: 'dws_dept_daily',
      rowsRead: visitRows.length + feeRows.length,
      rowsWritten: merged.size,
      affectedDates: mode === 'full' ? [] : dates,
    };
  });
}

/* --------------------------- ADS: 院级日指标 --------------------------- */

async function runAdsHospital(mode: RunMode, dates: string[]): Promise<JobResult> {
  return withTx(async (tx) => {
    const runRows = await tx`
      INSERT INTO meta.etl_job_runs (job_code, run_mode, status)
      VALUES ('ads_hospital_daily', ${mode}, 'running')
      RETURNING run_id
    `;
    const runId = String((runRows as Record<string, unknown>[])[0].run_id);

    if (mode === 'full') {
      await tx`TRUNCATE ads.hospital_daily_metrics`;
    } else {
      for (const d of dates) {
        await tx`DELETE FROM ads.hospital_daily_metrics WHERE stat_date = ${d}::date`;
      }
    }

    const dateFilter =
      mode === 'full' ? '' : `WHERE stat_date IN ('${dates.join("','")}')`;
    const rows = (await tx.unsafe(`
      SELECT stat_date,
        coalesce(sum(visit_count) FILTER (WHERE visit_type='outpatient'), 0) AS outpatient_visits,
        coalesce(sum(visit_count) FILTER (WHERE visit_type='inpatient'), 0)  AS inpatient_visits,
        coalesce(sum(visit_count) FILTER (WHERE visit_type='emergency'), 0)  AS emergency_visits,
        coalesce(sum(visit_count), 0) AS total_visits,
        coalesce(sum(fee_total), 0) AS total_revenue
      FROM dws.dept_daily_summary
      ${dateFilter}
      GROUP BY 1
    `)) as Record<string, unknown>[];

    for (const r of rows) {
      const totalVisits = Number(r.total_visits);
      const avg = totalVisits > 0 ? Number(r.total_revenue) / totalVisits : 0;
      await tx`
        INSERT INTO ads.hospital_daily_metrics
          (stat_date, outpatient_visits, inpatient_visits, emergency_visits,
           total_visits, total_revenue, avg_fee_per_visit)
        VALUES (
          ${r.stat_date}::date, ${r.outpatient_visits}, ${r.inpatient_visits},
          ${r.emergency_visits}, ${totalVisits}, ${r.total_revenue}, ${avg}
        )
        ON CONFLICT (stat_date) DO UPDATE SET
          outpatient_visits = EXCLUDED.outpatient_visits,
          inpatient_visits = EXCLUDED.inpatient_visits,
          emergency_visits = EXCLUDED.emergency_visits,
          total_visits = EXCLUDED.total_visits,
          total_revenue = EXCLUDED.total_revenue,
          avg_fee_per_visit = EXCLUDED.avg_fee_per_visit,
          etl_loaded_at = now()
      `;
    }

    await tx`
      UPDATE meta.etl_job_runs
      SET status = 'success', rows_read = ${rows.length},
          rows_written = ${rows.length}, finished_at = now()
      WHERE run_id = ${runId}
    `;

    return {
      jobCode: 'ads_hospital_daily',
      rowsRead: rows.length,
      rowsWritten: rows.length,
      affectedDates: mode === 'full' ? [] : dates,
    };
  });
}

/* ------------------------------ 全链路编排 ------------------------------ */

/**
 * 按依赖顺序运行全部 4 个作业。
 * - full：全量重抽 + 全量重算；
 * - incremental：DWD 增量抽取，DWS/ADS 只重算受影响日期。
 */
export async function runLakehousePipeline(mode: RunMode): Promise<JobResult[]> {
  const visit = await runDwdVisit(mode);
  let fee: JobResult;
  try {
    fee = await runDwdFee(mode);
  } catch {
    // 收费抽取失败不阻断就诊主链路（失败运行已由事务回滚，记录一条失败）
    const failDb = await import('../db/pool.js').then((m) => m.getDb());
    await failDb`
      INSERT INTO meta.etl_job_runs (job_code, run_mode, status, error_message, finished_at)
      VALUES ('dwd_fee', ${mode}, 'failed', '收费明细抽取失败', now())
    `;
    fee = {
      jobCode: 'dwd_fee',
      rowsRead: 0,
      rowsWritten: 0,
      affectedDates: [],
    };
  }

  const dates = [...new Set([...visit.affectedDates, ...fee.affectedDates])].sort();

  let dws: JobResult;
  let ads: JobResult;
  if (mode === 'full' || dates.length > 0) {
    dws = await runDwsDept(mode, dates);
    ads = await runAdsHospital(mode, mode === 'full' ? [] : dates);
  } else {
    dws = { jobCode: 'dws_dept_daily', rowsRead: 0, rowsWritten: 0, affectedDates: [] };
    ads = { jobCode: 'ads_hospital_daily', rowsRead: 0, rowsWritten: 0, affectedDates: [] };
  }

  return [visit, fee, dws, ads];
}

/** 单独运行某一个作业（DWS/ADS 触发全量重算）。 */
export async function runSingleJob(jobCode: JobCode): Promise<JobResult> {
  switch (jobCode) {
    case 'dwd_visit':
      return runDwdVisit('incremental');
    case 'dwd_fee':
      return runDwdFee('incremental');
    case 'dws_dept_daily':
      return runDwsDept('full', []);
    case 'ads_hospital_daily':
      await runDwsDept('full', []);
      return runAdsHospital('full', []);
  }
}
