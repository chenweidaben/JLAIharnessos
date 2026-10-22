/**
 * 健澜科技 jlmedaios - 死亡记录 v2 API（M652，配套 M579）
 *
 * 对接 BFF：GET /api/v1/death/records + POST /api/v1/death/records
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface DeathRecord {
  id: string;
  patientId: string;
  deceasedAt: string;
  primaryDiagnosis: string;
  directCause: string;
  underlyingCause: string;
  autopsyConsent: boolean;
  recordingDoctor: string;
}

export interface DeathRecordCreateInput {
  patientId: string;
  deceasedAt: string;
  primaryDiagnosis: string;
  directCause: string;
  underlyingCause: string;
  autopsyConsent: boolean;
  recordingDoctor: string;
}

const DEMO_DEATHS: DeathRecord[] = [
  {
    id: 'DR-001',
    patientId: 'P10030',
    deceasedAt: '2026-10-19T03:25:00+08:00',
    primaryDiagnosis: '急性广泛前壁心肌梗死',
    directCause: '心源性休克、心脏骤停',
    underlyingCause: '冠状动脉粥样硬化性心脏病',
    autopsyConsent: false,
    recordingDoctor: '刘主任',
  },
  {
    id: 'DR-002',
    patientId: 'P10031',
    deceasedAt: '2026-10-21T22:10:00+08:00',
    primaryDiagnosis: '重症肺炎、感染性休克、ARDS',
    directCause: '多器官功能衰竭',
    underlyingCause: '慢性阻塞性肺疾病急性加重',
    autopsyConsent: true,
    recordingDoctor: '陈主任',
  },
];

export interface DeathListResult {
  items: DeathRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchDeathRecords(patientId: string): Promise<DeathListResult> {
  try {
    const res = await get<{ items: DeathRecord[]; totalCount: number }>('/death/records', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_DEATHS.filter((d) => d.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createDeathRecord(input: DeathRecordCreateInput): Promise<DeathRecord> {
  return post<DeathRecord>('/death/records', input);
}
