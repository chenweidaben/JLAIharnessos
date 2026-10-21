/**
 * 健澜科技 jlmedaios - 在线问诊 API（M539，P0）
 *
 * 对接真实 BFF：
 *   GET  /api/v1/online-consults?patientId=  权限码 consult:view
 *   POST /api/v1/online-consults               权限码 consult:create
 *
 * 后端契约：POST body 仅接受 patientId / deptCode / symptomSummary / chiefComplaint /
 * urgency / preferredDoctorId / attachments[]；
 * priority（1=emergency / 2=urgent / 3=routine）、needsNurseTriage、初始 status=pending_triage
 * 由后端按 urgency 二次计算，前端纯函数仅实时预览。
 * BFF 不可用时返回确定性 DEMO 兜底记录并打标 demo:true；禁止裸 fetch。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get, post } from '../request';

/* ------------------------------------------------------------------ */
/* 枚举（英文 key，中文 label 由 LABEL map 映射）                       */
/* ------------------------------------------------------------------ */

export type Urgency = 'routine' | 'urgent' | 'emergency';

export const URGENCY_LABEL: Record<Urgency, string> = {
  routine: '常规',
  urgent: '加急',
  emergency: '急诊',
};

export const URGENCY_COLOR: Record<Urgency, string> = {
  routine: 'green',
  urgent: 'orange',
  emergency: 'red',
};

export const URGENCIES: Urgency[] = ['routine', 'urgent', 'emergency'];

export type ConsultStatus = 'pending_triage' | 'matched' | 'inProgress' | 'completed';

export const STATUS_LABEL: Record<ConsultStatus, string> = {
  pending_triage: '待分诊',
  matched: '已匹配医生',
  inProgress: '问诊中',
  completed: '已完成',
};

export const STATUS_COLOR: Record<ConsultStatus, string> = {
  pending_triage: 'orange',
  matched: 'blue',
  inProgress: 'processing',
  completed: 'green',
};

export const DEPT_LABEL: Record<string, string> = {
  internal: '内科',
  surgery: '外科',
  pediatrics: '儿科',
  gynecology: '妇科',
  general: '全科',
};

export const DEPTS: string[] = ['internal', 'surgery', 'pediatrics', 'gynecology', 'general'];

/* ------------------------------------------------------------------ */
/* 纯函数阈值（与后端冻结对齐，用于页面实时预览）                        */
/* ------------------------------------------------------------------ */

export function derivePriority(urgency: Urgency): { priority: number; needsNurseTriage: boolean } {
  if (urgency === 'emergency') return { priority: 1, needsNurseTriage: true };
  if (urgency === 'urgent') return { priority: 2, needsNurseTriage: true };
  return { priority: 3, needsNurseTriage: false };
}

/* ------------------------------------------------------------------ */
/* 记录结构                                                            */
/* ------------------------------------------------------------------ */

export interface OnlineConsultRecord {
  id: string;
  patientId: string;
  deptCode: string;
  symptomSummary: string;
  chiefComplaint: string;
  urgency: Urgency;
  preferredDoctorId: string | null;
  attachments: string[];
  priority: number;
  needsNurseTriage: boolean;
  status: ConsultStatus;
  createdAt: string;
  demo?: boolean;
  patientName?: string;
  signature?: string;
  assessorName?: string;
}

export interface OnlineConsultSubmitInput {
  patientId: string;
  patientName?: string;
  deptCode: string;
  symptomSummary?: string;
  chiefComplaint: string;
  urgency: Urgency;
  preferredDoctorId?: string | null;
  attachments?: string[];
  createdAt: string;
  signature: string;
  assessorName?: string;
}

export interface OnlineConsultListResult {
  data: OnlineConsultRecord[];
  demo: boolean;
}

export interface OnlineConsultSubmitResult {
  record: OnlineConsultRecord;
  demo: boolean;
}

/* ------------------------------------------------------------------ */
/* DEMO 兜底记录                                                        */
/* ------------------------------------------------------------------ */

const DEMO_RECORDS: OnlineConsultRecord[] = [
  {
    id: 'OC-DEMO-001',
    patientId: 'P-DEMO-003',
    patientName: '王卫国',
    deptCode: 'internal',
    symptomSummary: '胸痛伴大汗 30 分钟，含服硝酸甘油未缓解',
    chiefComplaint: '急性胸痛',
    urgency: 'emergency',
    preferredDoctorId: 'D-001',
    attachments: ['img-ecg-001.jpg'],
    priority: 1,
    needsNurseTriage: true,
    status: 'pending_triage',
    createdAt: new Date().toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
  {
    id: 'OC-DEMO-002',
    patientId: 'P-DEMO-001',
    patientName: '张建国',
    deptCode: 'general',
    symptomSummary: '随访血压控制情况',
    chiefComplaint: '高血压复诊',
    urgency: 'routine',
    preferredDoctorId: null,
    attachments: [],
    priority: 3,
    needsNurseTriage: false,
    status: 'completed',
    createdAt: new Date(Date.now() - 3600_000).toISOString(),
    signature: '陈医师',
    assessorName: '陈医师',
    demo: true,
  },
];

/* ------------------------------------------------------------------ */
/* API 调用                                                            */
/* ------------------------------------------------------------------ */

export async function fetchOnlineConsults(patientId?: string): Promise<OnlineConsultListResult> {
  try {
    const res = await get<OnlineConsultRecord[]>('/online-consults', patientId ? { patientId } : undefined);
    const items = Array.isArray(res) ? res : [];
    if (items.length > 0) return { data: items, demo: false };
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  } catch {
    return { data: DEMO_RECORDS.filter((r) => !patientId || r.patientId === patientId), demo: true };
  }
}

export async function submitOnlineConsult(input: OnlineConsultSubmitInput): Promise<OnlineConsultSubmitResult> {
  const payload = {
    patientId: input.patientId,
    deptCode: input.deptCode,
    symptomSummary: input.symptomSummary ?? '',
    chiefComplaint: input.chiefComplaint,
    urgency: input.urgency,
    preferredDoctorId: input.preferredDoctorId ?? null,
    attachments: input.attachments ?? [],
  };
  try {
    const res = await post<OnlineConsultRecord>('/online-consults', payload);
    const record: OnlineConsultRecord = {
      ...res,
      patientName: input.patientName,
      createdAt: input.createdAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: false,
    };
    return { record, demo: false };
  } catch (err) {
    void err;
    const { priority, needsNurseTriage } = derivePriority(input.urgency);
    const record: OnlineConsultRecord = {
      id: `OC-LOCAL-${Date.now().toString().slice(-8)}`,
      patientId: input.patientId,
      patientName: input.patientName,
      deptCode: input.deptCode,
      symptomSummary: input.symptomSummary ?? '',
      chiefComplaint: input.chiefComplaint,
      urgency: input.urgency,
      preferredDoctorId: input.preferredDoctorId ?? null,
      attachments: input.attachments ?? [],
      priority,
      needsNurseTriage,
      status: 'pending_triage',
      createdAt: input.createdAt,
      signature: input.signature,
      assessorName: input.assessorName,
      demo: true,
    };
    return { record, demo: true };
  }
}
