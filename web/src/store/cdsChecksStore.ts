/**
 * 健澜科技 jlmedaios - CDS 检查 Zustand store（M543，P0）
 *
 * state：上下文（患者/用药/检验/人口学）+ alerts + 元信息 + acting/error/demo。
 * check 前置门禁 patientId/visitId 必填；写接口失败由 service 降级 DEMO 结果并打标。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import {
  DEMO_CONTEXT,
  runCdsCheck,
  type CdsAlert,
  type CdsCheckRequest,
  type CdsLabs,
  type CdsMedication,
} from '@/services/api/cdsChecks';

interface CdsChecksState {
  patientId: string;
  visitId: string;
  medications: CdsMedication[];
  labs: CdsLabs;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  diagnoses: string[];
  alerts: CdsAlert[];
  checkedAt: string | null;
  ruleCount: number | null;
  acting: boolean;
  error: string | null;
  demo: boolean;
  lastResultDemo: boolean;
  loadContext: (input: Partial<CdsCheckRequest>) => void;
  check: () => Promise<void>;
  reset: () => void;
  clearError: () => void;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useCdsChecksStore = create<CdsChecksState>((set, get) => ({
  patientId: DEMO_CONTEXT.patientId,
  visitId: DEMO_CONTEXT.visitId,
  medications: DEMO_CONTEXT.medications,
  labs: DEMO_CONTEXT.labs,
  age: DEMO_CONTEXT.age,
  weight: DEMO_CONTEXT.weight,
  gender: DEMO_CONTEXT.gender,
  diagnoses: DEMO_CONTEXT.diagnoses,
  alerts: [],
  checkedAt: null,
  ruleCount: null,
  acting: false,
  error: null,
  demo: false,
  lastResultDemo: false,

  loadContext: (input) =>
    set((s) => ({
      patientId: input.patientId ?? s.patientId,
      visitId: input.visitId ?? s.visitId,
      medications: input.medications ?? s.medications,
      labs: input.labs ?? s.labs,
      age: input.age ?? s.age,
      weight: input.weight ?? s.weight,
      gender: input.gender ?? s.gender,
      diagnoses: input.diagnoses ?? s.diagnoses,
    })),

  check: async () => {
    const s = get();
    if (!s.patientId.trim() || !s.visitId.trim()) {
      set({ error: '请先选择患者/就诊（patientId 与 visitId 必填）' });
      return;
    }
    set({ acting: true, error: null });
    try {
      const input: CdsCheckRequest = {
        patientId: s.patientId,
        visitId: s.visitId,
        medications: s.medications,
        labs: s.labs,
        age: s.age,
        weight: s.weight,
        gender: s.gender,
        diagnoses: s.diagnoses,
      };
      const res = await runCdsCheck(input);
      set({
        alerts: res.alerts,
        checkedAt: res.checkedAt,
        ruleCount: res.ruleCount,
        demo: res.demo ?? false,
        lastResultDemo: res.demo ?? false,
        acting: false,
      });
    } catch (e) {
      set({ acting: false, error: errMsg(e, 'CDS 规则检查失败') });
    }
  },

  reset: () =>
    set({
      patientId: DEMO_CONTEXT.patientId,
      visitId: DEMO_CONTEXT.visitId,
      medications: DEMO_CONTEXT.medications,
      labs: DEMO_CONTEXT.labs,
      age: DEMO_CONTEXT.age,
      weight: DEMO_CONTEXT.weight,
      gender: DEMO_CONTEXT.gender,
      diagnoses: DEMO_CONTEXT.diagnoses,
      alerts: [],
      checkedAt: null,
      ruleCount: null,
      demo: false,
      lastResultDemo: false,
      error: null,
    }),

  clearError: () => set({ error: null }),
}));
