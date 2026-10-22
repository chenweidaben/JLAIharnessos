/**
 * 健澜科技 jlmedaios - 门诊排队叫号 API（M719）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface QueueCounter {
  id: string;
  dept: string;
  currentCallNo: string;
  waitingCount: number;
  avgWaitMinutes: number;
  waitingPatients: { queueNo: string; patientId: string; status: 'waiting' | 'called' }[];
  callHistory: { time: string; queueNo: string; doctor: string }[];
}

const DEMO: QueueCounter[] = [
  {
    id: 'Q-001',
    dept: '呼吸内科',
    currentCallNo: 'A018',
    waitingCount: 12,
    avgWaitMinutes: 18,
    waitingPatients: [
      { queueNo: 'A019', patientId: 'P10010', status: 'waiting' },
      { queueNo: 'A020', patientId: 'P10011', status: 'waiting' },
      { queueNo: 'A021', patientId: 'P10012', status: 'called' },
    ],
    callHistory: [
      { time: '10:25', queueNo: 'A017', doctor: '陈主任' },
      { time: '10:30', queueNo: 'A018', doctor: '陈主任' },
    ],
  },
];

export interface QueueListResult {
  items: QueueCounter[];
  demo: boolean;
}

export async function fetchQueues(): Promise<QueueListResult> {
  try {
    const res = await get<{ items: QueueCounter[] }>('/patient-service/queues');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
