/**
 * 健澜科技 jlmedaios - 输血管理类型（M10-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type TransfusionStatus =
  | 'requested' | 'crossmatched' | 'dispensed' | 'transfusing'
  | 'completed' | 'cancelled';

export interface TransfusionRequest {
  id: string;
  requestNo: string;
  visitId: string;
  patientId: string;
  department: string;
  applicantId: string;
  indication: string;
  indicationMeta: Record<string, unknown>;
  bloodType: string;
  component: string;
  unitCount: number;
  urgency: string;
  status: TransfusionStatus;
  rejectReason: string | null;
  crossmatchResult: string | null;
  crossmatchNote: string | null;
  crossmatchedBy: string | null;
  crossmatchedAt: string | null;
  batchNo: string | null;
  dispensedBy: string | null;
  dispensedAt: string | null;
  cancelledBy: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BloodStock {
  id: string;
  bloodType: string;
  component: string;
  batchNo: string;
  units: number;
  expiryDate: string | null;
}

export interface TransfusionDetail {
  req: TransfusionRequest;
  transfusion: {
    id: string;
    requestId: string;
    transfusedBy: string;
    coSignBy: string;
    dripRate: string | null;
    startAt: string | null;
    endAt: string | null;
    vitalSigns: Record<string, unknown>;
    status: string;
    stopReason: string | null;
    createdAt: string;
  } | null;
  reactions: Array<{
    id: string;
    severity: string;
    symptom: string;
    action: string;
    outcome: string | null;
    reportedBy: string;
    reportedAt: string;
  }>;
  stock: BloodStock[];
}

export const TRANSFUSION_STATUS_META: Record<TransfusionStatus, { label: string; color: string; step: number }> = {
  requested: { label: '已申请', color: 'orange', step: 0 },
  crossmatched: { label: '已配血', color: 'geekblue', step: 1 },
  dispensed: { label: '已发血', color: 'purple', step: 2 },
  transfusing: { label: '输注中', color: 'blue', step: 3 },
  completed: { label: '已完成', color: 'green', step: 4 },
  cancelled: { label: '已取消', color: 'red', step: -1 },
};

export const BLOOD_COMPONENT_LABEL: Record<string, string> = {
  red_cell: '红细胞',
  plasma: '血浆',
  platelet: '血小板',
  cryo: '冷沉淀',
  whole: '全血',
};
