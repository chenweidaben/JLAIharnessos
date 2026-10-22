/**
 * 健澜科技 jlmedaios - 入院记录 v2 API（M647，配套 M574）
 *
 * 对接 BFF：GET /api/v1/admission/records + POST /api/v1/admission/records
 *   （未注册则 DEMO 兜底，打标 demo:true；POST 不做成功兜底）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

export interface AdmissionRecord {
  id: string;
  patientId: string;
  ward: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  admittingDiagnosis: string;
  admittingDoctor: string;
  admittedAt: string;
}

export interface AdmissionCreateInput {
  patientId: string;
  ward: string;
  chiefComplaint: string;
  presentIllness: string;
  pastHistory: string;
  physicalExam: string;
  admittingDiagnosis: string;
  admittingDoctor: string;
}

const DEMO_ADMISSIONS: AdmissionRecord[] = [
  { id: 'AD-001', patientId: 'P10001', ward: '呼吸内科一病区', chiefComplaint: '咳嗽、咳痰 5 天，发热 2 天。', presentIllness: '5 天前受凉后出现咳嗽，白黏痰，2 天前发热 T 38.6℃，自服退热药物效果欠佳。', pastHistory: '高血压病史 5 年，口服氨氯地平，血压控制可；否认糖尿病、药物过敏史。', physicalExam: 'T 38.2℃，P 92 次/分，R 22 次/分，BP 135/85mmHg。神清，双肺呼吸音粗，右下肺可闻及湿啰音。', admittingDiagnosis: '社区获得性肺炎（右下肺）', admittingDoctor: '王医师', admittedAt: '2026-10-20T10:00:00+08:00' },
  { id: 'AD-002', patientId: 'P10004', ward: '普外科', chiefComplaint: '转移性右下腹痛 12 小时。', presentIllness: '12 小时前脐周痛，6 小时后转移至右下腹，伴恶心、无呕吐。', pastHistory: '既往体健。', physicalExam: '右下腹麦氏点压痛、反跳痛阳性。', admittingDiagnosis: '急性阑尾炎', admittingDoctor: '李医师', admittedAt: '2026-10-21T14:00:00+08:00' },
];

export interface AdmissionListResult {
  items: AdmissionRecord[];
  totalCount: number;
  demo: boolean;
}

export async function fetchAdmissionRecords(patientId: string): Promise<AdmissionListResult> {
  try {
    const res = await get<{ items: AdmissionRecord[]; totalCount: number }>('/admission/records', { patientId });
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_ADMISSIONS.filter((r) => r.patientId === patientId), totalCount: 0, demo: true };
  }
}

export async function createAdmissionRecord(input: AdmissionCreateInput): Promise<AdmissionRecord> {
  return post<AdmissionRecord>('/admission/records', input);
}
