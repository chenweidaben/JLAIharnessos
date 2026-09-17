/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 医疗质量管理（质控）场景 - 状态管理（Zustand）
 */
import { create } from 'zustand';
import type {
  CurrentQualityRecord,
  FrontPageRecord,
  QualityDefect,
  QualityResult,
  QualityRule,
  QualityStats,
  QualityTask,
  RectificationTask,
  RuleTestResult,
} from '@/types/quality';
import {
  mockCoreSystemResult,
  mockCurrentRecord,
  mockFrontPageRecords,
  mockQualityRules,
  mockQualityStats,
  mockQualityTasks,
  mockRectificationTasks,
} from '@/mock/qualityMock';
import { delay } from '@/mock/utils';

/** 根据缺陷计算扣分与病历等级 */
export function gradeFromScore(score: number, vetoItems: string[]): 'A' | 'B' | 'C' {
  if (vetoItems.length > 0) return 'C';
  if (score >= 90) return 'A';
  if (score >= 75) return 'B';
  return 'C';
}

interface QualityState {
  qualityTasks: QualityTask[];
  currentRecord: CurrentQualityRecord | null;
  qualityResult: QualityResult | null;
  qualityStats: QualityStats | null;
  qualityRules: QualityRule[];
  rectificationTasks: RectificationTask[];
  frontPageRecords: FrontPageRecord[];
  coreSystemResult: typeof mockCoreSystemResult | null;
  loading: boolean;
}

interface QualityActions {
  fetchQualityTasks: () => Promise<void>;
  fetchRecordDetail: (recordNo: string) => Promise<CurrentQualityRecord | null>;
  startQualityCheck: (recordNo: string) => Promise<void>;
  saveQualityResult: (result: QualityResult) => Promise<void>;
  submitQualityResult: (result: QualityResult) => Promise<void>;
  acceptAIDefect: (defectId: string, action: 'adopted' | 'ignored' | 'modified') => Promise<void>;
  addDefect: (defect: QualityDefect) => Promise<void>;
  removeDefect: (defectId: string) => Promise<void>;
  recalcScore: () => void;
  fetchQualityStats: () => Promise<void>;
  fetchQualityRules: () => Promise<void>;
  updateQualityRule: (rule: QualityRule) => Promise<void>;
  toggleRuleStatus: (ruleId: string) => Promise<void>;
  testRule: (ruleId: string) => Promise<RuleTestResult>;
  fetchRectificationTasks: () => Promise<void>;
  submitRectify: (taskId: string, content: string, note: string) => Promise<void>;
  reviewRectify: (taskId: string, result: 'approved' | 'rejected', note: string) => Promise<void>;
  fetchFrontPageRecords: () => Promise<void>;
  fetchCoreSystem: () => Promise<void>;
}

export type QualityStore = QualityState & QualityActions;

export const useQualityStore = create<QualityStore>((set, get) => ({
  qualityTasks: [],
  currentRecord: null,
  qualityResult: null,
  qualityStats: null,
  qualityRules: [],
  rectificationTasks: [],
  frontPageRecords: [],
  coreSystemResult: null,
  loading: false,

  fetchQualityTasks: async () => {
    set({ loading: true });
    await delay();
    set({ qualityTasks: mockQualityTasks, loading: false });
  },

  fetchRecordDetail: async (recordNo: string) => {
    await delay(200);
    const rec = mockCurrentRecord(recordNo);
    set({ currentRecord: rec, qualityResult: rec.result });
    return rec;
  },

  startQualityCheck: async (recordNo: string) => {
    await delay(150);
    const rec = mockCurrentRecord(recordNo);
    set({
      currentRecord: rec,
      qualityResult:
        rec.result ??
        ({
          resultId: `QR-${recordNo}`,
          recordNo,
          score: 100,
          grade: 'A',
          defects: rec.aiDefects.filter((d) => d.aiAction === 'adopted'),
          vetoItems: [],
          overallComment: '',
          strengths: '',
          weaknesses: '',
          rectifyRequirement: '',
          qualityDoctor: '周慧',
          qualityTime: new Date().toISOString(),
          signed: false,
        } as QualityResult),
      qualityTasks: get().qualityTasks.map((t) =>
        t.recordNo === recordNo ? { ...t, status: 'checking' as const } : t,
      ),
    });
  },

  saveQualityResult: async (result: QualityResult) => {
    await delay(120);
    set({ qualityResult: result });
  },

  submitQualityResult: async (result: QualityResult) => {
    await delay(300);
    const grade = gradeFromScore(result.score, result.vetoItems);
    const submitted: QualityResult = {
      ...result,
      grade,
      signed: true,
      qualityTime: new Date().toISOString(),
    };
    set({
      qualityResult: submitted,
      currentRecord: get().currentRecord ? { ...get().currentRecord!, result: submitted } : null,
      qualityTasks: get().qualityTasks.map((t) =>
        t.recordNo === result.recordNo
          ? {
              ...t,
              status:
                submitted.grade === 'C' || submitted.defects.length > 0 ? 'to_rectify' : 'checked',
              score: submitted.score,
              grade,
              defectCount: submitted.defects.length,
              qualityDoctor: submitted.qualityDoctor,
              qualityTime: submitted.qualityTime,
            }
          : t,
      ),
    });
  },

  acceptAIDefect: async (defectId, action) => {
    await delay(80);
    const rec = get().currentRecord;
    if (!rec) return;
    set({
      currentRecord: {
        ...rec,
        aiDefects: rec.aiDefects.map((d) =>
          d.defectId === defectId ? { ...d, aiAction: action } : d,
        ),
      },
    });
    // 采纳：转入正式缺陷列表
    if (action === 'adopted') {
      const target = rec.aiDefects.find((d) => d.defectId === defectId);
      const current = get().qualityResult;
      if (target && current) {
        const exists = current.defects.some((d) => d.defectId === defectId);
        if (!exists) {
          set({ qualityResult: { ...current, defects: [...current.defects, target] } });
          get().recalcScore();
        }
      }
    }
  },

  addDefect: async (defect: QualityDefect) => {
    await delay(80);
    const current = get().qualityResult;
    if (!current) return;
    set({ qualityResult: { ...current, defects: [...current.defects, defect] } });
    get().recalcScore();
  },

  removeDefect: async (defectId: string) => {
    await delay(80);
    const current = get().qualityResult;
    if (!current) return;
    set({
      qualityResult: {
        ...current,
        defects: current.defects.filter((d) => d.defectId !== defectId),
      },
    });
    get().recalcScore();
  },

  recalcScore: () => {
    const r = get().qualityResult;
    if (!r) return;
    const deduction = r.defects.reduce((sum, d) => sum + d.deduction, 0);
    const vetoPenalty = r.vetoItems.length > 0 ? 100 : 0;
    const raw = Math.max(0, 100 - deduction - vetoPenalty);
    const grade = gradeFromScore(raw, r.vetoItems);
    set({ qualityResult: { ...r, score: raw, grade } });
  },

  fetchQualityStats: async () => {
    set({ loading: true });
    await delay();
    set({ qualityStats: mockQualityStats, loading: false });
  },

  fetchQualityRules: async () => {
    await delay();
    set({ qualityRules: mockQualityRules });
  },

  updateQualityRule: async (rule: QualityRule) => {
    await delay(150);
    set({
      qualityRules: get().qualityRules.map((r) =>
        r.ruleId === rule.ruleId
          ? { ...rule, updatedAt: new Date().toISOString().slice(0, 10) }
          : r,
      ),
    });
  },

  toggleRuleStatus: async (ruleId: string) => {
    await delay(100);
    set({
      qualityRules: get().qualityRules.map((r) =>
        r.ruleId === ruleId ? { ...r, status: r.status === 'enabled' ? 'disabled' : 'enabled' } : r,
      ),
    });
  },

  testRule: async () => {
    await delay(400);
    return {
      triggered: true,
      hitFields: ['record_type = 住院', 'duration_hours > 24'],
      message: '规则命中测试样例病历，预期扣分 2 分。',
    };
  },

  fetchRectificationTasks: async () => {
    await delay();
    set({ rectificationTasks: mockRectificationTasks });
  },

  submitRectify: async (taskId, content, note) => {
    await delay(200);
    set({
      rectificationTasks: get().rectificationTasks.map((t) =>
        t.taskId === taskId
          ? {
              ...t,
              status: 'rectified' as const,
              rectifyContent: content,
              rectifyNote: note,
              rectifyTime: new Date().toISOString(),
            }
          : t,
      ),
    });
  },

  reviewRectify: async (taskId, result, note) => {
    await delay(200);
    set({
      rectificationTasks: get().rectificationTasks.map((t) =>
        t.taskId === taskId
          ? {
              ...t,
              status: 'reviewed' as const,
              reviewResult: result,
              reviewNote: note,
              rectifyScore: result === 'approved' ? 92 : t.rectifyScore,
            }
          : t,
      ),
    });
  },

  fetchFrontPageRecords: async () => {
    await delay();
    set({ frontPageRecords: mockFrontPageRecords });
  },

  fetchCoreSystem: async () => {
    await delay();
    set({ coreSystemResult: mockCoreSystemResult });
  },
}));
