/**
 * 健澜科技 jlmedaios - 门诊工作台状态管理（真实闭环，无 mock）
 *
 * 覆盖：候诊队列、当前就诊快照、问诊、诊断、医嘱、处方（本地草稿 + 服务端审方 + 药师审核）、
 * 病历、AI 流式对话（SSE）、统计。
 *
 * 数据原则：
 *  - 所有交易数据经 services/api 直连 BFF，真实落 PostgreSQL；刷新/重启不丢。
 *  - 连不上 BFF/真库时 error 明确上抛并由页面展示，绝不静默回填假数据。
 *  - 处方在“提交签名”前仅为本地草稿（draftRxLines），提交后以服务端返回的持久化数据为准。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';

import { useAuthStore } from './authStore';
import {
  addDiagnosis as apiAddDiagnosis,
  addOrder as apiAddOrder,
  auditPrescription as apiAuditPrescription,
  cancelOrder as apiCancelOrder,
  confirmDiagnosis as apiConfirmDiagnosis,
  type EncounterBundle,
  getEncounter as apiGetEncounter,
  getQueue,
  getStats,
  type PrescriptionSubmitLine,
  removeDiagnosis as apiRemoveDiagnosis,
  saveConsultation as apiSaveConsultation,
  saveRecord as apiSaveRecord,
  submitPrescription as apiSubmitPrescription,
} from '@/services/api/outpatient';
import {
  createAiConversation,
  getAiMessages,
  streamAiMessage,
} from '@/services/api/aiConversation';
import type {
  AIChatMessage,
  AiToolProcess,
  ConsultationRecord,
  DiagnosisItem,
  DoctorSession,
  DrugInfo,
  MedicalRecord,
  OrderItem,
  OutpatientStats,
  PatientBrief,
  Prescription,
  PrescriptionLine,
  PrescriptionType,
  PrescriptionWarning,
  QueueStatus,
  RecordContent,
  WaitingPatient,
} from '@/types/outpatient';

/** 生成前端临时 ID（仅用于草稿/占位，提交后由服务端真实 ID 替换） */
function localId(prefix: string): string {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

function nowLabel(): string {
  return new Date().toLocaleString('zh-CN', { hour12: false });
}

/** 归一化服务端审方告警（兼容不同字段名） */
function normalizeWarning(raw: unknown): PrescriptionWarning {
  const w = (raw ?? {}) as Record<string, unknown>;
  const rawLevel = String(w.level ?? w.severity ?? 'info');
  const level: PrescriptionWarning['level'] =
    rawLevel === 'danger' || rawLevel === 'error' || rawLevel === 'high'
      ? 'danger'
      : rawLevel === 'warning' || rawLevel === 'medium'
        ? 'warning'
        : 'info';
  return {
    level,
    title: String(w.title ?? w.rule ?? w.name ?? '用药提醒'),
    detail: String(w.detail ?? w.message ?? w.desc ?? ''),
    relatedDrug:
      (w.relatedDrug as string) ?? (w.drug as string) ?? (w.drugName as string) ?? undefined,
  };
}

/** 归一化处方（保证 warnings 结构一致、数值字段为 number） */
function normalizePrescription(raw: Prescription): Prescription {
  return {
    ...raw,
    lines: Array.isArray(raw.lines) ? raw.lines : [],
    warnings: Array.isArray(raw.warnings) ? raw.warnings.map(normalizeWarning) : [],
    totalFee: Number(raw.totalFee ?? 0),
    signed: Boolean(raw.signed),
  };
}

/** 将 BFF bundle 应用到 store（以服务端数据为准） */
function bundleToState(b: EncounterBundle) {
  return {
    currentEncounterId: b.encounterId,
    currentPatient: b.patient,
    consultation: b.consultation,
    diagnoses: b.diagnoses,
    orders: b.orders,
    prescriptions: (b.prescriptions ?? []).map(normalizePrescription),
    medicalRecord: b.medicalRecord,
    cdsReminders: (b.cdsReminders ?? []).map(normalizeWarning),
  };
}

/** 后端会话消息 → 门诊 AIChatMessage */
function toAiChat(m: {
  id: string;
  role: string;
  content: string | null;
  createdAt: string;
}): AIChatMessage | null {
  if (m.role !== 'user' && m.role !== 'assistant') return null;
  return {
    msgId: m.id,
    role: m.role === 'user' ? 'doctor' : 'ai',
    content: m.content ?? '',
    time: m.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/* Store                                                               */
/* ------------------------------------------------------------------ */

export interface OutpatientState {
  loading: boolean;
  error: string | null;
  doctor: DoctorSession | null;
  queue: WaitingPatient[];
  queueSearch: string;
  currentEncounterId: string | null;
  currentPatient: PatientBrief | null;
  consultation: ConsultationRecord | null;
  diagnoses: DiagnosisItem[];
  orders: OrderItem[];
  prescriptions: Prescription[];
  draftRxLines: PrescriptionLine[];
  medicalRecord: MedicalRecord | null;
  cdsReminders: PrescriptionWarning[];
  stats: OutpatientStats | null;
  activeTab: string;

  // AI
  aiConversationId: string | null;
  aiMessages: AIChatMessage[];
  aiToolProcesses: AiToolProcess[];
  aiStreaming: boolean;
  aiError: string | null;

  // actions
  syncDoctorFromAuth: () => void;
  fetchWaitingQueue: () => Promise<void>;
  setQueueSearch: (kw: string) => void;
  startConsultation: (encounterId: string) => Promise<void>;
  loadEncounter: (encounterId: string) => Promise<void>;
  clearEncounter: () => void;
  saveConsultation: (patch: Partial<ConsultationRecord>) => Promise<boolean>;
  addDiagnosis: (input: {
    code?: string;
    name: string;
    kind?: DiagnosisItem['kind'];
  }) => Promise<void>;
  confirmDiagnosis: (id: string, confirmed: boolean) => Promise<void>;
  removeDiagnosis: (id: string) => Promise<void>;
  addOrder: (input: {
    kind: OrderItem['kind'];
    catalogId: string;
    name: string;
    bodyPart?: string;
    price: number;
    clinicalReason: string;
    note?: string;
  }) => Promise<void>;
  cancelOrder: (orderId: string, reason?: string) => Promise<void>;

  // 处方草稿
  addDraftLine: (drug: DrugInfo) => void;
  updateDraftLine: (lineId: string, patch: Partial<PrescriptionLine>) => void;
  removeDraftLine: (lineId: string) => void;
  clearDraft: () => void;
  applyTemplateToDraft: (lines: Array<Partial<PrescriptionLine> & { drug: DrugInfo }>) => void;
  submitDraftPrescription: (type?: PrescriptionType) => Promise<boolean>;
  auditPrescription: (
    prescriptionId: string,
    decision: 'approved' | 'rejected',
    comment?: string,
  ) => Promise<void>;

  // 病历
  saveRecord: (content: RecordContent, signed?: boolean) => Promise<void>;

  fetchStats: () => Promise<void>;
  setActiveTab: (tab: string) => void;
  finishEncounter: () => Promise<void>;
  markQueueStatus: (encounterId: string, status: QueueStatus) => void;

  // AI
  initAiConversation: () => Promise<void>;
  sendAiMessage: (content: string) => Promise<void>;
  resetAiError: () => void;
}

export const useOutpatientStore = create<OutpatientState>()((set, get) => ({
  loading: false,
  error: null,
  doctor: null,
  queue: [],
  queueSearch: '',
  currentEncounterId: null,
  currentPatient: null,
  consultation: null,
  diagnoses: [],
  orders: [],
  prescriptions: [],
  draftRxLines: [],
  medicalRecord: null,
  cdsReminders: [],
  stats: null,
  activeTab: 'consult',

  aiConversationId: null,
  aiMessages: [],
  aiToolProcesses: [],
  aiStreaming: false,
  aiError: null,

  /* ---------------- 医生会话（来自真实登录用户） ---------------- */
  syncDoctorFromAuth: () => {
    const u = useAuthStore.getState().user;
    if (!u) return;
    set({
      doctor: {
        doctorId: u.id,
        doctorName: u.realName,
        title: u.title,
        deptName: u.deptName,
        room: '',
        todayQuota: 0,
        calledQuota: 0,
      },
    });
  },

  /* ---------------- 候诊队列 ---------------- */
  fetchWaitingQueue: async () => {
    set({ loading: true, error: null });
    try {
      const queue = (await getQueue()) as WaitingPatient[];
      set({ queue, loading: false });
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '加载候诊队列失败',
      });
    }
  },

  setQueueSearch: (kw) => set({ queueSearch: kw }),

  /* ---------------- 开始就诊 ---------------- */
  startConsultation: async (encounterId) => {
    // 标记为就诊中（队列本地状态），随后加载完整快照
    set((s) => ({
      queue: s.queue.map((q) =>
        q.encounterId === encounterId ? { ...q, status: 'in_consult' as QueueStatus } : q,
      ),
    }));
    await get().loadEncounter(encounterId);
  },

  loadEncounter: async (encounterId) => {
    set({ loading: true, error: null });
    try {
      const bundle = await apiGetEncounter(encounterId);
      set({
        ...bundleToState(bundle),
        draftRxLines: [],
        loading: false,
      });
      await get().initAiConversation();
    } catch (e) {
      set({
        loading: false,
        error: e instanceof Error ? e.message : '加载就诊快照失败',
      });
    }
  },

  clearEncounter: () =>
    set({
      currentEncounterId: null,
      currentPatient: null,
      consultation: null,
      diagnoses: [],
      orders: [],
      prescriptions: [],
      draftRxLines: [],
      medicalRecord: null,
      cdsReminders: [],
      aiConversationId: null,
      aiMessages: [],
      aiToolProcesses: [],
      aiError: null,
    }),

  /* ---------------- 问诊保存 ---------------- */
  saveConsultation: async (patch) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return false;
    try {
      const bundle = await apiSaveConsultation(encounterId, {
        chiefComplaint: patch.chiefComplaint,
        presentIllness: patch.presentIllness as Record<string, string>,
        pastHistory: patch.pastHistory as Record<string, string>,
        physicalExam: patch.physicalExam as Record<string, string>,
        auxiliaryExams: patch.auxiliaryExams,
      });
      set(bundleToState(bundle));
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '保存问诊失败' });
      return false;
    }
  },

  /* ---------------- 诊断 ---------------- */
  addDiagnosis: async (input) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiAddDiagnosis(encounterId, input);
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '添加诊断失败' });
    }
  },

  confirmDiagnosis: async (id, confirmed) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiConfirmDiagnosis(encounterId, id, confirmed);
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '确认诊断失败' });
    }
  },

  removeDiagnosis: async (id) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiRemoveDiagnosis(encounterId, id);
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '删除诊断失败' });
    }
  },

  /* ---------------- 医嘱 ---------------- */
  addOrder: async (input) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiAddOrder(encounterId, input);
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '开立医嘱失败' });
    }
  },

  cancelOrder: async (orderId, reason) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiCancelOrder(encounterId, orderId, reason ?? '医师撤销');
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '撤销医嘱失败' });
    }
  },

  /* ---------------- 处方草稿（本地） ---------------- */
  addDraftLine: (drug) => {
    const line: PrescriptionLine = {
      lineId: localId('line'),
      drug,
      dose: 1,
      doseUnit: /mg|g|ml|IU/i.exec(drug.spec)?.[0] ?? 'mg',
      frequency: 'tid',
      route: drug.dosageForm.includes('注射') ? 'ivgtt' : 'po',
      days: 7,
      quantity: 1,
      instruction: '遵医嘱',
      subtotal: drug.price,
    };
    set((s) => ({ draftRxLines: [...s.draftRxLines, line] }));
  },

  updateDraftLine: (lineId, patch) =>
    set((s) => ({
      draftRxLines: s.draftRxLines.map((l) => {
        if (l.lineId !== lineId) return l;
        const merged = { ...l, ...patch };
        merged.subtotal = Number((merged.drug.price * merged.quantity).toFixed(2));
        return merged;
      }),
    })),

  removeDraftLine: (lineId) =>
    set((s) => ({ draftRxLines: s.draftRxLines.filter((l) => l.lineId !== lineId) })),

  clearDraft: () => set({ draftRxLines: [] }),

  applyTemplateToDraft: (lines) =>
    set((s) => ({
      draftRxLines: [
        ...s.draftRxLines,
        ...lines.map((l) => {
          const drug = l.drug;
          const line: PrescriptionLine = {
            lineId: localId('line'),
            drug,
            dose: l.dose ?? 1,
            doseUnit: l.doseUnit ?? 'mg',
            frequency: l.frequency ?? 'tid',
            route: l.route ?? 'po',
            days: l.days ?? 7,
            quantity: l.quantity ?? 1,
            instruction: l.instruction ?? '遵医嘱',
            subtotal: drug.price * (l.quantity ?? 1),
          };
          return line;
        }),
      ],
    })),

  /* ---------------- 提交处方（服务端审方 + 医师签名） ---------------- */
  submitDraftPrescription: async () => {
    const encounterId = get().currentEncounterId;
    const draft = get().draftRxLines;
    if (!encounterId || draft.length === 0) return false;
    const lines: PrescriptionSubmitLine[] = draft.map((l) => ({
      drugId: l.drug.drugId,
      dose: l.dose,
      doseUnit: l.doseUnit,
      frequency: l.frequency,
      route: l.route,
      days: l.days,
      quantity: l.quantity,
      instruction: l.instruction,
    }));
    try {
      const bundle = await apiSubmitPrescription(encounterId, { lines });
      set({ ...bundleToState(bundle), draftRxLines: [] });
      return true;
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '提交处方失败' });
      return false;
    }
  },

  /* ---------------- 药师审核 ---------------- */
  auditPrescription: async (prescriptionId, decision, comment) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiAuditPrescription(encounterId, prescriptionId, {
        decision,
        comment,
      });
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '药师审核失败' });
    }
  },

  /* ---------------- 病历保存 / 签名 ---------------- */
  saveRecord: async (content, signed) => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    try {
      const bundle = await apiSaveRecord(encounterId, {
        content: { ...(content as unknown as Record<string, string>) },
        signed,
      });
      set(bundleToState(bundle));
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '保存病历失败' });
    }
  },

  /* ---------------- 统计 ---------------- */
  fetchStats: async () => {
    try {
      const stats = await getStats();
      set({ stats });
    } catch (e) {
      set({ error: e instanceof Error ? e.message : '加载统计失败' });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),

  /* ---------------- 结束就诊 ---------------- */
  finishEncounter: async () => {
    const encounterId = get().currentEncounterId;
    if (!encounterId) return;
    set((s) => ({
      queue: s.queue.map((q) =>
        q.encounterId === encounterId ? { ...q, status: 'visited' as QueueStatus } : q,
      ),
    }));
    get().clearEncounter();
  },

  markQueueStatus: (encounterId, status) =>
    set((s) => ({
      queue: s.queue.map((q) => (q.encounterId === encounterId ? { ...q, status } : q)),
    })),

  /* ---------------- AI 流式对话 ---------------- */
  initAiConversation: async () => {
    const encounterId = get().currentEncounterId;
    const patient = get().currentPatient;
    if (!encounterId || !patient) return;
    try {
      const title = `门诊对话·${patient.nameMasked}`;
      const conv = await createAiConversation({
        title,
        patientId: patient.patientId,
        encounterId,
      });
      const msgs = await getAiMessages(conv.id);
      set({
        aiConversationId: conv.id,
        aiMessages: msgs.map(toAiChat).filter((m): m is AIChatMessage => m !== null),
        aiError: null,
      });
    } catch (e) {
      set({ aiError: e instanceof Error ? e.message : '初始化 AI 会话失败' });
    }
  },

  sendAiMessage: async (content) => {
    const convId = get().aiConversationId;
    const text = content.trim();
    if (!convId || !text || get().aiStreaming) return;

    const doctorMsg: AIChatMessage = {
      msgId: localId('m'),
      role: 'doctor',
      content: text,
      time: nowLabel(),
    };
    const aiPlaceholderId = localId('m');
    const aiPlaceholder: AIChatMessage = {
      msgId: aiPlaceholderId,
      role: 'ai',
      content: '',
      time: nowLabel(),
    };
    set((s) => ({
      aiMessages: [...s.aiMessages, doctorMsg, aiPlaceholder],
      aiStreaming: true,
      aiError: null,
      aiToolProcesses: [],
    }));

    const patchPlaceholder = (fn: (c: string) => string): void => {
      set((s) => ({
        aiMessages: s.aiMessages.map((m) =>
          m.msgId === aiPlaceholderId ? { ...m, content: fn(m.content) } : m,
        ),
      }));
    };

    await streamAiMessage(convId, text, {
      onDelta: (delta) => patchPlaceholder((c) => c + delta),
      onTool: (ev) =>
        set((s) => {
          const processes = s.aiToolProcesses.slice();
          const idx = processes.findIndex((p) => p.callId === ev.callId);
          if (ev.stage === 'start') {
            if (idx === -1) {
              processes.push({
                callId: ev.callId,
                toolName: ev.toolName,
                status: 'running',
              });
            }
          } else {
            const next: AiToolProcess = {
              callId: ev.callId,
              toolName: ev.toolName,
              status: ev.success ? 'success' : 'error',
              summary: ev.summary,
            };
            if (idx === -1) processes.push(next);
            else processes[idx] = next;
          }
          return { aiToolProcesses: processes };
        }),
      onDone: (payload) => {
        set((s) => ({
          aiStreaming: false,
          aiMessages: s.aiMessages.map((m) =>
            m.msgId === aiPlaceholderId
              ? {
                  ...m,
                  content: m.content || payload.message.content,
                  msgId: payload.message.id || m.msgId,
                }
              : m,
          ),
        }));
      },
      onError: (code, message) => {
        set((s) => ({
          aiStreaming: false,
          aiError: message,
          aiMessages: s.aiMessages.map((m) =>
            m.msgId === aiPlaceholderId
              ? { ...m, content: m.content || `（AI 服务异常：${message}）` }
              : m,
          ),
        }));
        void code;
      },
    });
    set({ aiStreaming: false });
  },

  resetAiError: () => set({ aiError: null }),
}));
