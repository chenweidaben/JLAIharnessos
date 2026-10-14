/**
 * 健澜科技 jlmedaios - AI 原生五件套 store（M88-A 病历草稿 / M88-B 合理用药 /
 *   M88-C 鉴别诊断 / M88-D 临床路径 / M88-E 住院天数费用预测）
 * Copyright (c) 2026 杭州健澜科技有限公司
 *
 * 所有请求统一走 @/api/client 的 fetch 封装，信封 code===0 后解包 data；
 * 字段形状与 BFF src/db/repositories/*Repo 的 mapRow 输出保持一致（camelCase）。
 */
import { create } from 'zustand';
import { get as httpGet, post } from '@/api/client';

/* ------------------------------------------------------------------ */
/* 领域类型（与后端 repo mapRow 对齐）                                    */
/* ------------------------------------------------------------------ */

export interface AiNoteDraft {
  id: string;
  visitId: string;
  draftType: string;
  promptContext: string;
  generatedContent: string;
  modelVersion: string | null;
  status: 'draft' | 'accepted' | 'rejected' | 'modified';
  reviewedBy: string | null;
  reviewedAt: string | null;
  doctorEdit: string | null;
  createdAt: string;
}

export interface MedReview {
  id: string;
  visitId: string;
  orderId: string | null;
  drugName: string;
  reviewType: string;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  suggestion: string | null;
  status: 'open' | 'acknowledged' | 'overridden';
  reviewedBy: string | null;
  reviewedAt: string | null;
  overrideReason: string | null;
  createdAt: string;
}

export interface DiagnosisSuggestion {
  id: string;
  visitId: string;
  chiefComplaint: string;
  symptoms: string[];
  suggestions: Array<{ diagnosis: string; confidence: number; icd10: string }>;
  confidence: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  selectedDiagnosis: string | null;
  reviewedBy: string | null;
  reviewedAt: string | null;
}

export interface PathwayRec {
  id: string;
  visitId: string;
  diagnosis: string;
  pathwayName: string;
  pathwayCode: string | null;
  steps: Array<{ day: number; action: string; responsible: string }>;
  expectedDays: number | null;
  confidence: number | null;
  status: 'pending' | 'accepted' | 'rejected';
  acceptedAt: string | null;
}

export interface LosPrediction {
  id: string;
  visitId: string;
  predictedLosDays: number;
  predictedCost: number;
  riskLevel: 'low' | 'medium' | 'high';
  factors: Array<{ factor: string; impact: string }>;
  confidence: number | null;
  modelVersion: string | null;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/* M88-A 病历草稿生成 + 人工复核闭环                                     */
/* ------------------------------------------------------------------ */

interface NoteDraftState {
  drafts: AiNoteDraft[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  load: (visitId: string) => Promise<void>;
  generate: (input: { visitId: string; draftType: string; context: string }) => Promise<AiNoteDraft | null>;
  review: (id: string, status: 'accepted' | 'rejected' | 'modified', doctorEdit?: string) => Promise<void>;
}

export const useNoteDraftStore = create<NoteDraftState>((set, get) => ({
  drafts: [],
  loading: false,
  submitting: false,
  error: null,
  load: async (visitId) => {
    if (!visitId) return;
    set({ loading: true, error: null });
    try {
      set({ drafts: await httpGet<AiNoteDraft[]>('/ai-note-drafts', { visitId }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  generate: async (input) => {
    set({ submitting: true, error: null });
    try {
      const draft = await post<AiNoteDraft>('/ai-note-drafts/generate', input);
      await get().load(input.visitId);
      return draft;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '生成失败' });
      return null;
    } finally {
      set({ submitting: false });
    }
  },
  review: async (id, status, doctorEdit) => {
    set({ submitting: true, error: null });
    try {
      await post<AiNoteDraft>(`/ai-note-drafts/${id}/review`, { status, doctorEdit });
      // 复核成功后由页面按 visitId 重新 load
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '复核失败' });
    } finally {
      set({ submitting: false });
    }
  },
}));

/* ------------------------------------------------------------------ */
/* M88-B 合理用药审查                                                    */
/* ------------------------------------------------------------------ */

interface MedReviewState {
  reviews: MedReview[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  load: (visitId: string) => Promise<void>;
  run: (input: {
    visitId: string; drugName: string; patientAge?: number; allergies?: string[]; orderId?: string;
  }) => Promise<MedReview[]>;
  override: (id: string, reason: string) => Promise<void>;
}

export const useMedReviewStore = create<MedReviewState>((set, _get) => ({
  reviews: [],
  loading: false,
  submitting: false,
  error: null,
  load: async (visitId) => {
    if (!visitId) return;
    set({ loading: true, error: null });
    try {
      set({ reviews: await httpGet<MedReview[]>('/med-reviews', { visitId }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  run: async (input) => {
    set({ submitting: true, error: null });
    try {
      const result = await post<MedReview[]>('/med-reviews/run', input);
      set({ reviews: result });
      return result;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审查失败' });
      return [];
    } finally {
      set({ submitting: false });
    }
  },
  override: async (id, reason) => {
    set({ submitting: true, error: null });
    try {
      await post<MedReview>(`/med-reviews/${id}/override`, { reason });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '豁免失败' });
    } finally {
      set({ submitting: false });
    }
  },
}));

/* ------------------------------------------------------------------ */
/* M88-C 鉴别诊断建议                                                    */
/* ------------------------------------------------------------------ */

interface DiagnosisState {
  list: DiagnosisSuggestion[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  load: (visitId: string) => Promise<void>;
  suggest: (input: { visitId: string; chiefComplaint: string; symptoms: string[] }) => Promise<DiagnosisSuggestion | null>;
  review: (id: string, accepted: boolean, selectedDiagnosis?: string) => Promise<void>;
}

export const useDiagnosisStore = create<DiagnosisState>((set, get) => ({
  list: [],
  loading: false,
  submitting: false,
  error: null,
  load: async (visitId) => {
    if (!visitId) return;
    set({ loading: true, error: null });
    try {
      set({ list: await httpGet<DiagnosisSuggestion[]>('/diagnosis-suggestions', { visitId }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  suggest: async (input) => {
    set({ submitting: true, error: null });
    try {
      const rec = await post<DiagnosisSuggestion>('/diagnosis-suggestions/suggest', input);
      await get().load(input.visitId);
      return rec;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '鉴别诊断失败' });
      return null;
    } finally {
      set({ submitting: false });
    }
  },
  review: async (id, accepted, selectedDiagnosis) => {
    set({ submitting: true, error: null });
    try {
      await post<DiagnosisSuggestion>(`/diagnosis-suggestions/${id}/review`, { accepted, selectedDiagnosis });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '审核失败' });
    } finally {
      set({ submitting: false });
    }
  },
}));

/* ------------------------------------------------------------------ */
/* M88-D 临床路径推荐                                                    */
/* ------------------------------------------------------------------ */

interface PathwayRecState {
  list: PathwayRec[];
  loading: boolean;
  submitting: boolean;
  error: string | null;
  load: (visitId: string) => Promise<void>;
  recommend: (input: { visitId: string; diagnosis: string }) => Promise<PathwayRec | null>;
  accept: (id: string) => Promise<void>;
}

export const usePathwayRecStore = create<PathwayRecState>((set, get) => ({
  list: [],
  loading: false,
  submitting: false,
  error: null,
  load: async (visitId) => {
    if (!visitId) return;
    set({ loading: true, error: null });
    try {
      set({ list: await httpGet<PathwayRec[]>('/pathway-recommendations', { visitId }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  recommend: async (input) => {
    set({ submitting: true, error: null });
    try {
      const rec = await post<PathwayRec>('/pathway-recommendations/recommend', input);
      await get().load(input.visitId);
      return rec;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '路径推荐失败' });
      return null;
    } finally {
      set({ submitting: false });
    }
  },
  accept: async (id) => {
    set({ submitting: true, error: null });
    try {
      await post<PathwayRec>(`/pathway-recommendations/${id}/accept`, {});
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '采纳失败' });
    } finally {
      set({ submitting: false });
    }
  },
}));

/* ------------------------------------------------------------------ */
/* M88-E 住院天数与费用预测 + 风险分层                                    */
/* ------------------------------------------------------------------ */

interface LosPredictionState {
  latest: LosPrediction | null;
  loading: boolean;
  submitting: boolean;
  error: string | null;
  loadLatest: (visitId: string) => Promise<void>;
  predict: (input: { visitId: string; age?: number; diagnosis?: string; comorbidities?: number }) => Promise<LosPrediction | null>;
}

export const useLosPredictionStore = create<LosPredictionState>((set, _get) => ({
  latest: null,
  loading: false,
  submitting: false,
  error: null,
  loadLatest: async (visitId) => {
    if (!visitId) return;
    set({ loading: true, error: null });
    try {
      set({ latest: await httpGet<LosPrediction | null>('/los-predictions/latest', { visitId }) });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载失败' });
    } finally {
      set({ loading: false });
    }
  },
  predict: async (input) => {
    set({ submitting: true, error: null });
    try {
      const rec = await post<LosPrediction>('/los-predictions/predict', input);
      set({ latest: rec });
      return rec;
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '预测失败' });
      return null;
    } finally {
      set({ submitting: false });
    }
  },
}));
