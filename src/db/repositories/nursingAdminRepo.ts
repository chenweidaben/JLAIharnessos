/**
 * 健澜科技 jlmedaios - 护理管理后台（排班 + NQI 指标）数据访问（M16-B）
 *
 * 纯数据读写；合规校验与指标计算在 src/medical-tools/nursing 纯函数内完成。
 * 适配层每次 getDb()，不缓存连接。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb } from '../pool.js';

/** date/time/timestamptz 经 postgres.js 返回 Date，统一格式化为 ISO 日期/时间串 */
function isoDate(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(0, 10);
  return String(v).slice(0, 10);
}
function isoTime(v: unknown): string {
  if (v == null) return '';
  if (v instanceof Date) return v.toISOString().slice(11, 19);
  return String(v).slice(0, 8);
}

export interface ShiftDefinitionRow {
  id: string; wardId: string | null; code: string; name: string;
  startTime: string; endTime: string; color: string | null;
  isNight: boolean; hours: number; status: string;
}

export interface ScheduleRow {
  id: string; wardId: string; scheduleDate: string; nurseId: string;
  shiftId: string; shiftName: string | null; status: string;
  publishedBy: string | null; publishedAt: string | null; createdAt: string;
}

export interface LeaveRow {
  id: string; nurseId: string; leaveDate: string; leaveType: string;
  reason: string | null; status: string; createdAt: string;
}

export interface IndicatorRow {
  code: string; name: string; category: string | null;
  numeratorDef: string | null; denominatorDef: string | null; unit: string | null;
  direction: string; frequency: string | null; sourceType: string;
  threshold: number | null; description: string | null; sortOrder: number;
}

export interface IndicatorValueRow {
  id: string; indicatorCode: string; wardId: string | null; period: string;
  numerator: string | null; denominator: string | null; value: string | null;
  source: string; note: string | null; enteredBy: string | null; createdAt: string;
}

export interface WindowMetrics {
  bedCount: number; nurseCount: number; onDutyNurseCount: number;
  inpatientCount: number; highPressureRiskCount: number; highFallRiskCount: number;
  scheduledCount: number; compliantScheduledCount: number;
}

// ---------------------------------------------------------------------------
// 病区 DataScope
// ---------------------------------------------------------------------------
export async function listWardsByDepartment(department: string | null): Promise<{ id: string; name: string; department: string }[]> {
  const db = getDb();
  if (department) {
    return await db<{ id: string; name: string; department: string }[]>`
      SELECT id::text, name, department FROM clinical.wards
      WHERE department = ${department} AND status = 'active' ORDER BY name`;
  }
  return await db<{ id: string; name: string; department: string }[]>`
    SELECT id::text, name, department FROM clinical.wards WHERE status = 'active' ORDER BY name`;
}

// ---------------------------------------------------------------------------
// 班次定义
// ---------------------------------------------------------------------------
export async function listShiftDefinitions(wardId: string | null): Promise<ShiftDefinitionRow[]> {
  const db = getDb();
  const rows = wardId
    ? await db`SELECT * FROM clinical.nursing_shift_definitions
        WHERE status='active' AND (ward_id IS NULL OR ward_id = ${wardId}) ORDER BY start_time`
    : await db`SELECT * FROM clinical.nursing_shift_definitions WHERE status='active' AND ward_id IS NULL ORDER BY start_time`;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id), wardId: r.ward_id ? String(r.ward_id) : null, code: String(r.code),
    name: String(r.name), startTime: isoTime(r.start_time), endTime: isoTime(r.end_time),
    color: r.color ? String(r.color) : null, isNight: Boolean(r.is_night),
    hours: Number(r.hours), status: String(r.status),
  }));
}

// ---------------------------------------------------------------------------
// 排班
// ---------------------------------------------------------------------------
export async function listSchedules(opts: { wardId?: string; from?: string; to?: string }): Promise<ScheduleRow[]> {
  const db = getDb();
  const rows = await db`
    SELECT s.*, d.name AS shift_name FROM clinical.nursing_schedules s
    LEFT JOIN clinical.nursing_shift_definitions d ON d.id = s.shift_id
    WHERE (${opts.wardId ?? null}::uuid IS NULL OR s.ward_id = ${opts.wardId ?? null}::uuid)
      AND (${opts.from ?? null}::date IS NULL OR s.schedule_date >= ${opts.from ?? null}::date)
      AND (${opts.to ?? null}::date IS NULL OR s.schedule_date <= ${opts.to ?? null}::date)
    ORDER BY s.schedule_date, s.ward_id`;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id), wardId: String(r.ward_id), scheduleDate: isoDate(r.schedule_date),
    nurseId: String(r.nurse_id), shiftId: String(r.shift_id),
    shiftName: r.shift_name ? String(r.shift_name) : null, status: String(r.status),
    publishedBy: r.published_by ? String(r.published_by) : null,
    publishedAt: r.published_at ? String(r.published_at) : null, createdAt: String(r.created_at),
  }));
}

export async function createSchedule(input: {
  wardId: string; date: string; nurseId: string; shiftId: string; createdBy: string;
}): Promise<ScheduleRow> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.nursing_schedules (ward_id, schedule_date, nurse_id, shift_id, created_by)
    VALUES (${input.wardId}::uuid, ${input.date}::date, ${input.nurseId}::uuid, ${input.shiftId}::uuid, ${input.createdBy}::uuid)
    ON CONFLICT (ward_id, schedule_date, nurse_id, shift_id) DO NOTHING
    RETURNING *`;
  const r = rows[0] ?? (await db`SELECT * FROM clinical.nursing_schedules
    WHERE ward_id=${input.wardId}::uuid AND schedule_date=${input.date}::date
      AND nurse_id=${input.nurseId}::uuid AND shift_id=${input.shiftId}::uuid`)[0];
  return {
    id: String(r.id), wardId: String(r.ward_id), scheduleDate: isoDate(r.schedule_date),
    nurseId: String(r.nurse_id), shiftId: String(r.shift_id), shiftName: null,
    status: String(r.status), publishedBy: r.published_by ? String(r.published_by) : null,
    publishedAt: r.published_at ? String(r.published_at) : null, createdAt: String(r.created_at),
  };
}

export async function publishSchedule(wardId: string, date: string, actorId: string): Promise<number> {
  const db = getDb();
  const r = await db`
    UPDATE clinical.nursing_schedules
    SET status='published', published_by=${actorId}::uuid, published_at=now()
    WHERE ward_id=${wardId}::uuid AND schedule_date=${date}::date AND status='draft'`;
  return r.count;
}

// ---------------------------------------------------------------------------
// 休假
// ---------------------------------------------------------------------------
export async function listLeave(opts: { nurseId?: string; from?: string; to?: string }): Promise<LeaveRow[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.nursing_leave
    WHERE (${opts.nurseId ?? null}::uuid IS NULL OR nurse_id = ${opts.nurseId ?? null}::uuid)
      AND (${opts.from ?? null}::date IS NULL OR leave_date >= ${opts.from ?? null}::date)
      AND (${opts.to ?? null}::date IS NULL OR leave_date <= ${opts.to ?? null}::date)
    ORDER BY leave_date`;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id), nurseId: String(r.nurse_id), leaveDate: isoDate(r.leave_date),
    leaveType: String(r.leave_type), reason: r.reason ? String(r.reason) : null,
    status: String(r.status), createdAt: String(r.created_at),
  }));
}

export async function createLeave(input: {
  nurseId: string; date: string; leaveType: string; reason?: string; createdBy: string;
}): Promise<LeaveRow> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.nursing_leave (nurse_id, leave_date, leave_type, reason, created_by)
    VALUES (${input.nurseId}::uuid, ${input.date}::date, ${input.leaveType}, ${input.reason ?? null}, ${input.createdBy}::uuid)
    ON CONFLICT (nurse_id, leave_date) DO NOTHING
    RETURNING *`;
  const r = rows[0] ?? (await db`SELECT * FROM clinical.nursing_leave
    WHERE nurse_id=${input.nurseId}::uuid AND leave_date=${input.date}::date`)[0];
  return {
    id: String(r.id), nurseId: String(r.nurse_id), leaveDate: isoDate(r.leave_date),
    leaveType: String(r.leave_type), reason: r.reason ? String(r.reason) : null,
    status: String(r.status), createdAt: String(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// 指标库 + 指标值
// ---------------------------------------------------------------------------
export async function listIndicators(): Promise<IndicatorRow[]> {
  const db = getDb();
  const rows = await db`SELECT * FROM clinical.nursing_indicators ORDER BY sort_order`;
  return rows.map((r: Record<string, unknown>) => ({
    code: String(r.code), name: String(r.name), category: r.category ? String(r.category) : null,
    numeratorDef: r.numerator_def ? String(r.numerator_def) : null,
    denominatorDef: r.denominator_def ? String(r.denominator_def) : null,
    unit: r.unit ? String(r.unit) : null, direction: String(r.direction),
    frequency: r.frequency ? String(r.frequency) : null, sourceType: String(r.source_type),
    threshold: r.threshold != null ? Number(r.threshold) : null,
    description: r.description ? String(r.description) : null, sortOrder: Number(r.sort_order),
  }));
}

export async function listIndicatorValues(period: string, wardId: string | null): Promise<IndicatorValueRow[]> {
  const db = getDb();
  const rows = await db`
    SELECT * FROM clinical.nursing_indicator_values
    WHERE period = ${period}
      AND (${wardId ?? null}::uuid IS NULL OR ward_id = ${wardId ?? null}::uuid)
    ORDER BY indicator_code`;
  return rows.map((r: Record<string, unknown>) => ({
    id: String(r.id), indicatorCode: String(r.indicator_code),
    wardId: r.ward_id ? String(r.ward_id) : null, period: String(r.period),
    numerator: r.numerator != null ? String(r.numerator) : null,
    denominator: r.denominator != null ? String(r.denominator) : null,
    value: r.value != null ? String(r.value) : null, source: String(r.source),
    note: r.note ? String(r.note) : null, enteredBy: r.entered_by ? String(r.entered_by) : null,
    createdAt: String(r.created_at),
  }));
}

export async function saveIndicatorValue(input: {
  indicatorCode: string; wardId: string | null; period: string;
  numerator: number; denominator: number; source: 'manual'; note?: string; enteredBy: string;
}): Promise<IndicatorValueRow> {
  const db = getDb();
  const rows = await db`
    INSERT INTO clinical.nursing_indicator_values
      (indicator_code, ward_id, period, numerator, denominator, source, note, entered_by)
    VALUES (${input.indicatorCode}, ${input.wardId ?? null}::uuid, ${input.period},
      ${input.numerator}, ${input.denominator}, ${input.source}, ${input.note ?? null}, ${input.enteredBy}::uuid)
    ON CONFLICT (indicator_code, ward_id, period, source) DO UPDATE
      SET numerator=EXCLUDED.numerator, denominator=EXCLUDED.denominator,
          note=EXCLUDED.note, entered_by=EXCLUDED.entered_by, updated_at=now()
    RETURNING *`;
  const r = rows[0];
  return {
    id: String(r.id), indicatorCode: String(r.indicator_code),
    wardId: r.ward_id ? String(r.ward_id) : null, period: String(r.period),
    numerator: r.numerator != null ? String(r.numerator) : null,
    denominator: r.denominator != null ? String(r.denominator) : null,
    value: r.value != null ? String(r.value) : null, source: String(r.source),
    note: r.note ? String(r.note) : null, enteredBy: r.entered_by ? String(r.entered_by) : null,
    createdAt: String(r.created_at),
  };
}

// ---------------------------------------------------------------------------
// 窗口指标聚合（从业务表自动取分子分母原始计数）
// ---------------------------------------------------------------------------
export async function aggregateWindowMetrics(opts: {
  wardId: string; from: string; to: string;
}): Promise<WindowMetrics> {
  const db = getDb();
  const wardId = opts.wardId;

  // 开放床位数
  const bedRow = await db<{ c: number }[]>`SELECT COUNT(*)::int AS c FROM clinical.beds WHERE ward_id=${wardId}::uuid`;
  // 本病区在岗护士（nurse 角色、未删）
  const nurseRow = await db<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM iam.users u
    WHERE u.role='nurse' AND u.deleted_at IS NULL
      AND u.department = (SELECT department FROM clinical.wards WHERE id=${wardId}::uuid)`;
  // 在院患者（本病区当前在床）
  const inpatientRow = await db<{ c: number }[]>`
    SELECT COUNT(*)::int AS c FROM clinical.beds b
    WHERE b.ward_id=${wardId}::uuid AND b.current_patient_id IS NOT NULL`;
  // 高危标识（时间窗内 nursing_records）
  const riskRow = await db<{ high_p: number; high_f: number }[]>`
    SELECT
      COUNT(*) FILTER (WHERE r.pressure_sore_risk='high')::int AS high_p,
      COUNT(*) FILTER (WHERE r.fall_risk='high')::int AS high_f
    FROM clinical.nursing_records r
    WHERE r.visit_id IN (SELECT v.id FROM clinical.visits v
      JOIN clinical.beds b ON b.current_visit_id = v.id WHERE b.ward_id=${wardId}::uuid)
      AND r.created_at >= ${opts.from}::date AND r.created_at < (${opts.to}::date + interval '1 day')`;
  // 排班条数与合规条数
  const schedRow = await db<{ total: number; compliant: number }[]>`
    SELECT COUNT(*)::int AS total,
      COUNT(*) FILTER (WHERE s.status='published')::int AS compliant
    FROM clinical.nursing_schedules s
    WHERE s.ward_id=${wardId}::uuid AND s.schedule_date >= ${opts.from}::date AND s.schedule_date <= ${opts.to}::date`;

  return {
    bedCount: bedRow[0].c,
    nurseCount: nurseRow[0].c,
    onDutyNurseCount: 0, // 当班护士由实时班次视图计算，这里退化为 0，护患比由调用方覆盖
    inpatientCount: inpatientRow[0].c,
    highPressureRiskCount: riskRow[0].high_p,
    highFallRiskCount: riskRow[0].high_f,
    scheduledCount: schedRow[0].total,
    compliantScheduledCount: schedRow[0].compliant,
  };
}
