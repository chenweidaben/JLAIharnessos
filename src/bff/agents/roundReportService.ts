/**
 * MEDMUSE 晨间查房交班报告服务。
 *
 * 流程：在管患者清单 → 逐患者聚合就诊详情 → 识别异常（未审草稿/待会诊）→
 * 生成中文摘要 → 幂等落 clinical.medmuse_round_reports（每医生每日一份）。
 *
 * 医疗安全：报告只读聚合，不修改任何临床数据；摘要仅做事实计数，不下诊断结论。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { getDb, type Sql } from '../../db/pool.js';
import { listManagedPatients, type ManagedPatientRow } from './toolRegistry';
import {
  DefaultToolExecutor,
  type ToolContext,
} from './toolRegistry';
import * as consultRequestRepo from '../../db/repositories/consultRequestRepo';

/** 交班报告行结构 */
export interface RoundReport {
  id: string;
  doctorId: string;
  reportDate: string;
  summary: string;
  abnormalPatients: ManagedPatientRow[];
  pendingTasks: Array<{ kind: string; visitId: string; detail: string }>;
  patientCount: number;
  createdAt: string;
}

function db(): Sql {
  return getDb();
}

/** 仅用于聚合工具调用的最小上下文 */
function agentCtx(userId: string): ToolContext {
  return { userId, sessionId: 'round-report', confirmed: true };
}

/**
 * 生成指定医生当日的晨间交班报告。
 * 同日重复调用走 ON CONFLICT DO UPDATE 覆盖，幂等。
 */
export async function generateRoundReport(doctorId: string): Promise<RoundReport> {
  const patients = await listManagedPatients(doctorId);
  const executor = new DefaultToolExecutor();

  // 逐患者并行取就诊详情（限制并发避免打爆连接池，分块处理）
  const detailResults = await Promise.all(
    patients.map((p) =>
      executor.execute('getVisitDetail', { visitId: p.visitId }, agentCtx(doctorId)),
    ),
  );

  const abnormalPatients: ManagedPatientRow[] = [];
  const pendingTasks: Array<{ kind: string; visitId: string; detail: string }> = [];

  // 未审病历草稿计数
  let draftsPending = 0;
  patients.forEach((p, i) => {
    const det = detailResults[i];
    if (!det || !det.ok) return;
    const r = det.result as { latestNoteDraft?: { status?: string } | null };
    if (r.latestNoteDraft && r.latestNoteDraft.status === 'draft') {
      draftsPending += 1;
      pendingTasks.push({
        kind: 'note_draft_review',
        visitId: p.visitId,
        detail: `${p.patientName} 有一份病历草稿待审`,
      });
      abnormalPatients.push(p);
    }
  });

  // 待处理会诊（全局 pending，命中本医生在管就诊则计入）
  const pendingConsults = await consultRequestRepo.listPending();
  const managedVisitIds = new Set(patients.map((p) => p.visitId));
  let consultPending = 0;
  for (const c of pendingConsults) {
    if (managedVisitIds.has(c.visitId)) {
      consultPending += 1;
      pendingTasks.push({
        kind: 'consult',
        visitId: c.visitId,
        detail: `会诊申请待处理（${c.consultingDept}：${c.reason}）`,
      });
    }
  }

  // 异常检验值计数（当前 listManagedPatients.latestAbnormal 预留字段，暂无危急值接入）
  const abnormalLabCount = patients.filter((p) => p.latestAbnormal).length;
  abnormalPatients.push(
    ...patients.filter((p) => p.latestAbnormal && !abnormalPatients.includes(p)),
  );

  const summary =
    `医生，今日在管患者 ${patients.length} 人，` +
    `其中 ${abnormalLabCount} 人有异常检验值，` +
    `${draftsPending} 份病历待审，` +
    `${consultPending} 例会诊待处理。`;

  const rows = await db()<Array<{
    id: string; doctor_id: string; report_date: string; summary: string;
    abnormal_patients: unknown; pending_tasks: unknown; patient_count: number;
    created_at: string;
  }>>`
    INSERT INTO clinical.medmuse_round_reports
      (doctor_id, report_date, summary, abnormal_patients, pending_tasks, patient_count)
    VALUES (
      ${doctorId},
      current_date,
      ${summary},
      ${JSON.stringify(abnormalPatients)}::jsonb,
      ${JSON.stringify(pendingTasks)}::jsonb,
      ${patients.length}
    )
    ON CONFLICT (doctor_id, report_date) DO UPDATE
      SET summary = EXCLUDED.summary,
          abnormal_patients = EXCLUDED.abnormal_patients,
          pending_tasks = EXCLUDED.pending_tasks,
          patient_count = EXCLUDED.patient_count
    RETURNING *
  `;
  const row = rows[0];
  return {
    id: row.id,
    doctorId: row.doctor_id,
    reportDate: row.report_date,
    summary: row.summary,
    abnormalPatients: (row.abnormal_patients as ManagedPatientRow[]) ?? [],
    pendingTasks: (row.pending_tasks as Array<{ kind: string; visitId: string; detail: string }>) ?? [],
    patientCount: row.patient_count,
    createdAt: row.created_at,
  };
}

/**
 * 查询指定医生的交班报告历史；可选 date=YYYY-MM-DD 过滤单日。
 */
export async function listRoundReports(
  doctorId: string,
  date?: string,
): Promise<RoundReport[]> {
  const rows = date
    ? await db()<Array<{
        id: string; doctor_id: string; report_date: string; summary: string;
        abnormal_patients: unknown; pending_tasks: unknown; patient_count: number;
        created_at: string;
      }>>`
        SELECT * FROM clinical.medmuse_round_reports
        WHERE doctor_id = ${doctorId} AND report_date = ${date}
        ORDER BY report_date DESC
      `
    : await db()<Array<{
        id: string; doctor_id: string; report_date: string; summary: string;
        abnormal_patients: unknown; pending_tasks: unknown; patient_count: number;
        created_at: string;
      }>>`
        SELECT * FROM clinical.medmuse_round_reports
        WHERE doctor_id = ${doctorId}
        ORDER BY report_date DESC
      `;
  return rows.map((r) => ({
    id: r.id,
    doctorId: r.doctor_id,
    reportDate: r.report_date,
    summary: r.summary,
    abnormalPatients: (r.abnormal_patients as ManagedPatientRow[]) ?? [],
    pendingTasks: (r.pending_tasks as Array<{ kind: string; visitId: string; detail: string }>) ?? [],
    patientCount: r.patient_count,
    createdAt: r.created_at,
  }));
}
