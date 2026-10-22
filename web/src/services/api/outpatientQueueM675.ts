/**
 * 健澜科技 jlmedaios - 门诊医生站 API（M675）
 *
 * 对接 BFF：GET /api/v1/outpatient/queue（DEMO 兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type QueueStatus = 'waiting' | 'called' | 'in_visit' | 'visited' | 'skipped';

export interface QueueEntry {
  seq: number;
  patientId: string;
  name: string;
  visitType: 'normal' | 'emergency' | 'appointment';
  status: QueueStatus;
  chiefComplaint: string;
}

export const QUEUE_STATUS_META: Record<QueueStatus, { label: string; color: string }> = {
  waiting: { label: '候诊', color: 'default' },
  called: { label: '已叫号', color: 'orange' },
  in_visit: { label: '就诊中', color: 'processing' },
  visited: { label: '已诊', color: 'green' },
  skipped: { label: '过号', color: 'red' },
};

export const VISIT_TYPE_META: Record<QueueEntry['visitType'], { label: string; color: string }> = {
  normal: { label: '普通', color: 'blue' },
  emergency: { label: '急诊', color: 'red' },
  appointment: { label: '预约', color: 'purple' },
};

const DEMO_QUEUE: QueueEntry[] = [
  { seq: 1, patientId: 'P20001', name: '张**', visitType: 'appointment', status: 'in_visit', chiefComplaint: '反复咳嗽 2 周' },
  { seq: 2, patientId: 'P20002', name: '李**', visitType: 'normal', status: 'waiting', chiefComplaint: '胸闷 3 天' },
  { seq: 3, patientId: 'P20003', name: '王**', visitType: 'normal', status: 'waiting', chiefComplaint: '体检发现肺结节' },
  { seq: 4, patientId: 'P20004', name: '赵**', visitType: 'emergency', status: 'called', chiefComplaint: '突发呼吸困难' },
  { seq: 5, patientId: 'P20005', name: '陈**', visitType: 'appointment', status: 'visited', chiefComplaint: '慢阻肺复诊' },
];

export interface QueueResult {
  items: QueueEntry[];
  demo: boolean;
}

export async function fetchOutpatientQueue(): Promise<QueueResult> {
  try {
    const res = await get<{ items: QueueEntry[] }>('/outpatient/queue');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO_QUEUE, demo: true };
  }
}
