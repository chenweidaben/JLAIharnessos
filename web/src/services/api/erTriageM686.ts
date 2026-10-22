/**
 * 健澜科技 jlmedaios - 急诊分诊台 API（M686）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type TriageLevel = 1 | 2 | 3 | 4 | 5;

export interface ErTriage {
  id: string;
  queueNo: string;
  patientId: string;
  chiefComplaint: string;
  level: TriageLevel;
  waitedMinutes: number;
  heartRate: number;
  sbp: number;
  dbp: number;
  spo2: number;
  triageReason: string;
  disposition: string;
}

export const TRIAGE_LEVEL_META: Record<TriageLevel, { label: string; color: string; maxWaitMin: number }> = {
  1: { label: 'I 级 濒危', color: 'red', maxWaitMin: 0 },
  2: { label: 'II 级 危重', color: 'orange', maxWaitMin: 10 },
  3: { label: 'III 级 紧急', color: 'gold', maxWaitMin: 30 },
  4: { label: 'IV 级 次紧急', color: 'blue', maxWaitMin: 60 },
  5: { label: 'V 级 非紧急', color: 'default', maxWaitMin: 120 },
};

const DEMO: ErTriage[] = [
  {
    id: 'ET-001',
    queueNo: 'ER-001',
    patientId: 'P30001',
    chiefComplaint: '胸痛 2 小时伴大汗',
    level: 1,
    waitedMinutes: 2,
    heartRate: 110,
    sbp: 90,
    dbp: 60,
    spo2: 92,
    triageReason: '胸痛 + 低血压 + SpO₂ 下降，疑似 ACS/休克。',
    disposition: '立即抢救室，10 分钟内心内科会诊。',
  },
  {
    id: 'ET-002',
    queueNo: 'ER-002',
    patientId: 'P30002',
    chiefComplaint: '发热 38.5℃ 咳嗽 3 天',
    level: 3,
    waitedMinutes: 25,
    heartRate: 95,
    sbp: 125,
    dbp: 78,
    spo2: 97,
    triageReason: '生命体征平稳，发热呼吸道症状。',
    disposition: '急诊内科诊室候诊，30 分钟内接诊。',
  },
  {
    id: 'ET-003',
    queueNo: 'ER-003',
    patientId: 'P30003',
    chiefComplaint: '右手切割伤 30 分钟',
    level: 4,
    waitedMinutes: 45,
    heartRate: 80,
    sbp: 120,
    dbp: 75,
    spo2: 99,
    triageReason: '局部外伤，无活动性大出血。',
    disposition: '清创缝合室候诊。',
  },
];

export interface TriageListResult {
  items: ErTriage[];
  demo: boolean;
}

export async function fetchErTriage(): Promise<TriageListResult> {
  try {
    const res = await get<{ items: ErTriage[] }>('/er/triage');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
