/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 门诊问诊场景 - Zustand 状态管理
 * 覆盖候诊队列、当前就诊、问诊记录、诊断、处方、检查检验、病历、AI 对话、统计。
 */
import { create } from 'zustand';
import type {
  AIChatMessage,
  AuxExamResult,
  ConsultationRecord,
  DiagnosisItem,
  DoctorSession,
  MedicalRecord,
  OrderItem,
  OutpatientStats,
  PatientBrief,
  Prescription,
  PrescriptionLine,
  QueueStatus,
  WaitingPatient,
} from '@/types/outpatient';
import {
  mockAIChatHistory,
  mockConsultation,
  mockCurrentPatient,
  mockDoctorSession,
  mockHistoryDiagnoses,
  mockInitialOrders,
  mockInitialPrescription,
  mockStats,
  mockWaitingQueue,
} from '@/mock/outpatientMock';

/* -------------------------------------------------------------------------- */
/*                              处方审核（规则引擎）                            */
/* -------------------------------------------------------------------------- */

/** 简单的处方审核：过敏、重复用药、剂量提示 */
function reviewPrescription(p: Prescription, patient: PatientBrief | null): Prescription {
  const warnings = [...p.warnings];
  if (!patient) return { ...p, warnings };

  // 过敏提醒
  for (const line of p.lines) {
    const g = line.drug.genericName;
    if (patient.allergies.some((a) => g.includes(a) || a.includes(g.slice(0, 2)))) {
      warnings.push({
        level: 'danger',
        title: '过敏禁忌',
        detail: `患者对 ${patient.allergies.join('、')} 过敏，禁止开具 ${g}。`,
        relatedDrug: g,
      });
    }
  }

  // 青霉素/头孢皮试提醒
  for (const line of p.lines) {
    if (line.drug.drugId === 'D019') {
      warnings.push({
        level: 'danger',
        title: '青霉素皮试',
        detail: '注射用青霉素钠使用前必须皮试，皮试阴性方可使用。',
        relatedDrug: line.drug.genericName,
      });
    }
  }

  // 重复用药（同类他汀）
  const statins = p.lines.filter((l) => ['D003', 'D012'].includes(l.drug.drugId));
  if (statins.length >= 2) {
    warnings.push({
      level: 'warning',
      title: '重复用药',
      detail: '同时开具两种他汀类药物，可能增加肌病/肝损风险。',
    });
  }

  // 阿司匹林+氯吡格雷相互作用
  const hasAspirin = p.lines.some((l) => l.drug.drugId === 'D001' || l.drug.drugId === 'D034');
  const hasClopidogrel = p.lines.some((l) => l.drug.drugId === 'D002' || l.drug.drugId === 'D053');
  if (hasAspirin && hasClopidogrel) {
    warnings.push({
      level: 'warning',
      title: '双联抗血小板',
      detail: '阿司匹林+氯吡格雷双联治疗，需评估出血风险，建议联用 PPI。',
    });
  }

  // 超量提醒（单次 > 5 倍常用量粗判）
  return { ...p, warnings };
}

/* -------------------------------------------------------------------------- */
/*                              Store 状态                                     */
/* -------------------------------------------------------------------------- */

interface OutpatientState {
  loading: boolean;
  doctor: DoctorSession;
  queue: WaitingPatient[];
  currentPatient: PatientBrief | null;
  currentEncounterId: string | null;
  consultation: ConsultationRecord | null;
  prescriptions: Prescription[];
  orders: OrderItem[];
  diagnoses: DiagnosisItem[];
  medicalRecord: MedicalRecord | null;
  aiMessages: AIChatMessage[];
  stats: OutpatientStats;
  queueSearch: string;
  activeTab: string;

  // actions
  fetchWaitingQueue: () => Promise<void>;
  fetchCurrentPatient: (encounterId: string) => Promise<void>;
  startConsultation: (encounterId: string) => void;
  saveConsultation: (patch: Partial<ConsultationRecord>) => void;
  addAuxExam: (exam: AuxExamResult) => void;
  addDiagnosis: (d: DiagnosisItem) => void;
  removeDiagnosis: (id: string) => void;
  confirmDiagnosis: (id: string) => void;
  addPrescriptionLine: (rxId: string, line: PrescriptionLine) => void;
  removePrescriptionLine: (rxId: string, lineId: string) => void;
  submitPrescription: (rxId: string) => void;
  addOrder: (o: OrderItem) => void;
  cancelOrder: (orderId: string) => void;
  addChatMessage: (msg: AIChatMessage) => void;
  setQueueSearch: (kw: string) => void;
  setActiveTab: (tab: string) => void;
  callNext: () => void;
  markStatus: (encounterId: string, status: QueueStatus) => void;
  finishConsultation: () => void;
  updateMedicalRecord: (patch: Partial<MedicalRecord>) => void;
}

export const useOutpatientStore = create<OutpatientState>((set, get) => ({
  loading: false,
  doctor: mockDoctorSession,
  queue: [],
  currentPatient: null,
  currentEncounterId: null,
  consultation: null,
  prescriptions: [mockInitialPrescription],
  orders: mockInitialOrders,
  diagnoses: mockHistoryDiagnoses,
  medicalRecord: null,
  aiMessages: mockAIChatHistory,
  stats: mockStats,
  queueSearch: '',
  activeTab: 'consult',

  fetchWaitingQueue: async () => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 200));
    set({ queue: mockWaitingQueue, loading: false });
  },

  fetchCurrentPatient: async (encounterId) => {
    set({ loading: true });
    await new Promise((r) => setTimeout(r, 150));
    const found = get().queue.find((q) => q.encounterId === encounterId);
    set({
      currentPatient: found ? found.patient : mockCurrentPatient,
      currentEncounterId: encounterId,
      consultation: { ...mockConsultation, encounterId },
      loading: false,
    });
  },

  startConsultation: (encounterId) => {
    set((s) => ({
      queue: s.queue.map((q) =>
        q.encounterId === encounterId ? { ...q, status: 'in_consult' } : q,
      ),
    }));
    void get().fetchCurrentPatient(encounterId);
  },

  saveConsultation: (patch) => {
    set((s) => ({
      consultation: s.consultation
        ? { ...s.consultation, ...patch, updatedAt: new Date().toLocaleString('zh-CN') }
        : null,
    }));
  },

  addAuxExam: (exam) => {
    set((s) => ({
      consultation: s.consultation
        ? { ...s.consultation, auxiliaryExams: [...s.consultation.auxiliaryExams, exam] }
        : null,
    }));
  },

  addDiagnosis: (d) => set((s) => ({ diagnoses: [...s.diagnoses, d] })),
  removeDiagnosis: (id) => set((s) => ({ diagnoses: s.diagnoses.filter((d) => d.id !== id) })),
  confirmDiagnosis: (id) =>
    set((s) => ({
      diagnoses: s.diagnoses.map((d) => (d.id === id ? { ...d, confirmed: true } : d)),
    })),

  addPrescriptionLine: (rxId, line) =>
    set((s) => {
      const prescriptions = s.prescriptions.map((p) => {
        if (p.prescriptionId !== rxId) return p;
        const lines = [...p.lines, line];
        const totalFee = lines.reduce((sum, l) => sum + l.subtotal, 0);
        return reviewPrescription({ ...p, lines, totalFee }, s.currentPatient);
      });
      return { prescriptions };
    }),

  removePrescriptionLine: (rxId, lineId) =>
    set((s) => {
      const prescriptions = s.prescriptions.map((p) => {
        if (p.prescriptionId !== rxId) return p;
        const lines = p.lines.filter((l) => l.lineId !== lineId);
        const totalFee = lines.reduce((sum, l) => sum + l.subtotal, 0);
        return reviewPrescription({ ...p, lines, totalFee }, s.currentPatient);
      });
      return { prescriptions };
    }),

  submitPrescription: (rxId) =>
    set((s) => ({
      prescriptions: s.prescriptions.map((p) =>
        p.prescriptionId === rxId ? { ...p, signed: true } : p,
      ),
    })),

  addOrder: (o) =>
    set((s) => ({
      orders: [...s.orders, o],
      stats: { ...s.stats, orderCount: s.stats.orderCount + 1 },
    })),

  cancelOrder: (orderId) => set((s) => ({ orders: s.orders.filter((o) => o.orderId !== orderId) })),

  addChatMessage: (msg) => set((s) => ({ aiMessages: [...s.aiMessages, msg] })),

  setQueueSearch: (kw) => set({ queueSearch: kw }),
  setActiveTab: (tab) => set({ activeTab: tab }),

  callNext: () => {
    const s = get();
    const next = s.queue.find((q) => q.status === 'waiting');
    if (!next) return;
    set((prev) => ({
      queue: prev.queue.map((q) => {
        if (q.encounterId === next.encounterId)
          return { ...q, status: 'in_consult' as QueueStatus };
        if (q.status === 'in_consult') return { ...q, status: 'visited' as QueueStatus };
        return q;
      }),
      doctor: { ...prev.doctor, calledQuota: prev.doctor.calledQuota + 1 },
      stats: {
        ...prev.stats,
        todayWaiting: Math.max(0, prev.stats.todayWaiting - 1),
        todayVisited: prev.stats.todayVisited + 1,
      },
    }));
    void get().fetchCurrentPatient(next.encounterId);
  },

  markStatus: (encounterId, status) =>
    set((s) => ({
      queue: s.queue.map((q) => (q.encounterId === encounterId ? { ...q, status } : q)),
    })),

  finishConsultation: () => {
    const s = get();
    if (!s.currentEncounterId) return;
    set((prev) => ({
      queue: prev.queue.map((q) =>
        q.encounterId === prev.currentEncounterId ? { ...q, status: 'visited' as QueueStatus } : q,
      ),
      currentPatient: null,
      currentEncounterId: null,
      consultation: null,
      prescriptions: [mockInitialPrescription],
      orders: mockInitialOrders,
      diagnoses: [],
    }));
    // 自动叫下一位
    setTimeout(() => get().callNext(), 300);
  },

  updateMedicalRecord: (patch) =>
    set((s) => ({
      medicalRecord: s.medicalRecord ? { ...s.medicalRecord, ...patch } : null,
    })),
}));
