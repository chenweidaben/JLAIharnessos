/**
 * 健澜科技 jlmedaios - 满意度提醒 repo（M64-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import { getDb } from '../../db/pool.js';

export interface ReminderTarget {
  surveyId: string;
  visitId: string;
  patientId: string;
  department: string;
  reminderStage: string;
  createdAt: string;
}

/** 扫描待提醒：已存在满意度记录但 reminder_stage 未推进到 done。 */
export async function scanDueReminders(): Promise<ReminderTarget[]> {
  const db = getDb();
  const rows = await db`
    SELECT id AS survey_id, visit_id, patient_id, department, reminder_stage, created_at
    FROM clinical.satisfaction_surveys
    WHERE reminder_stage IN ('none', 'first_sent')
  `;
  return (rows as Record<string, unknown>[]).map((r) => ({
    surveyId: String(r.survey_id),
    visitId: String(r.visit_id),
    patientId: String(r.patient_id),
    department: String(r.department),
    reminderStage: String(r.reminder_stage),
    createdAt: String(r.created_at),
  }));
}

export async function markReminder(surveyId: string, stage: string): Promise<void> {
  const db = getDb();
  await db`
    UPDATE clinical.satisfaction_surveys SET reminder_stage=${stage} WHERE id=${surveyId}
  `;
}
