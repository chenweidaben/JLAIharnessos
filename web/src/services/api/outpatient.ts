/**
 * 健澜科技 jlmedaios - 门诊工作台 API
 *
 * 真实模式直连 BFF（/outpatient/*），交易数据真实落 PostgreSQL；
 * 演示模式（mockEnabled）下不在此服务内造假数据——由 store 决定是否使用本地 mock。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post, del, patch } from '../request';
import type {
  DiagnosisCatalog, DiagnosisItem, ExamCatalogItem, LabPanel,
  MedicalRecord, OrderItem, OutpatientStats, PatientBrief,
  Prescription, PrescriptionTemplate, RecordContent, RecordTemplate,
  TreatmentCatalogItem, ConsultationRecord,
} from '@/types/outpatient';

export interface EncounterBundle {
  encounterId: string;
  patient: PatientBrief;
  consultation: ConsultationRecord;
  diagnoses: DiagnosisItem[];
  orders: OrderItem[];
  prescriptions: Prescription[];
  medicalRecord: MedicalRecord | null;
  cdsReminders: Prescription['warnings'];
}

interface ConsultationPayload {
  chiefComplaint?: string;
  presentIllness?: Record<string, string>;
  pastHistory?: Record<string, string>;
  physicalExam?: Record<string, string>;
  auxiliaryExams?: unknown[];
}

export interface PrescriptionSubmitLine {
  drugId: string;
  dose: number; doseUnit: string; frequency: string; route: string;
  days: number; quantity: number; instruction: string; skinTest?: boolean;
}

const base = '/outpatient';

/* 队列 / 快照 */
export const getQueue = (): Promise<unknown[]> => get(`${base}/queue`);
export const getEncounter = (id: string): Promise<EncounterBundle> =>
  get(`${base}/encounters/${id}`);

/* 问诊 */
export const saveConsultation = (id: string, data: ConsultationPayload): Promise<EncounterBundle> =>
  post(`${base}/encounters/${id}/consultation`, data);

/* 诊断 */
export const addDiagnosis = (
  id: string, data: { code?: string; name: string; kind?: DiagnosisItem['kind'] },
): Promise<EncounterBundle> => post(`${base}/encounters/${id}/diagnoses`, data);
export const confirmDiagnosis = (
  id: string, did: string, confirmed: boolean,
): Promise<EncounterBundle> => patch(`${base}/encounters/${id}/diagnoses/${did}`, { confirmed });
export const removeDiagnosis = (id: string, did: string): Promise<EncounterBundle> =>
  del(`${base}/encounters/${id}/diagnoses/${did}`);

/* 医嘱 */
export const addOrder = (
  id: string, data: {
    kind: OrderItem['kind']; catalogId: string; name: string;
    bodyPart?: string; price: number; clinicalReason: string; note?: string;
  },
): Promise<EncounterBundle> => post(`${base}/encounters/${id}/orders`, data);
export const cancelOrder = (
  id: string, oid: string, reason: string,
): Promise<EncounterBundle> => post(`${base}/encounters/${id}/orders/${oid}/cancel`, { reason });

/* 处方 */
export const submitPrescription = (
  id: string, data: { lines: PrescriptionSubmitLine[]; counsel?: string },
): Promise<EncounterBundle> => post(`${base}/encounters/${id}/prescriptions`, data);
export const auditPrescription = (
  id: string, pid: string, data: { decision: 'approved' | 'rejected'; comment?: string },
): Promise<EncounterBundle> => post(`${base}/encounters/${id}/prescriptions/${pid}/audit`, data);

/* 病历 */
export const saveRecord = (
  id: string, data: { content: Record<string, string>; signed?: boolean },
): Promise<EncounterBundle> => post(`${base}/encounters/${id}/records`, data);

/* AI 生成病历草稿（真实 LLM，失败抛错不造假） */
export const generateAiRecordApi = (id: string): Promise<RecordContent> =>
  post(`${base}/encounters/${id}/ai-record`, {});

/* 统计 */
export const getStats = (): Promise<OutpatientStats> => get(`${base}/stats`);

/* 药品检索（真实库） */
export const searchDrugsApi = (keyword: string): Promise<unknown[]> =>
  get(`${base}/drugs`, { keyword });

/* 目录 */
export const fetchDiagnosisCatalog = (): Promise<{
  diagnoses: DiagnosisCatalog[]; common: DiagnosisCatalog[];
}> => get(`${base}/catalog/diagnoses`);
export const searchDiagnosisCatalog = (keyword: string): Promise<DiagnosisCatalog[]> =>
  get(`${base}/catalog/diagnoses`, { keyword });
export const fetchLabs = (): Promise<ExamCatalogItem[]> => get(`${base}/catalog/labs`);
export const fetchImaging = (): Promise<ExamCatalogItem[]> => get(`${base}/catalog/imaging`);
export const fetchTreatments = (): Promise<TreatmentCatalogItem[]> =>
  get(`${base}/catalog/treatments`);
export const fetchLabPanels = (): Promise<LabPanel[]> => get(`${base}/catalog/lab-panels`);
export const fetchPrescriptionTemplates = (): Promise<PrescriptionTemplate[]> =>
  get(`${base}/catalog/templates/prescription`);
export const fetchRecordTemplates = (): Promise<RecordTemplate[]> =>
  get(`${base}/catalog/templates/record`);
