/**
 * 健澜科技 jlmedaios - 门诊医生工作站 Zustand store
 *
 * 拉取 GET /opd/workstation；客户端维护 ICD 搜索关键字（与后端 searchIcd 同规则）、
 * 病历模板选中片段、检查检验已勾选项。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getOpdWorkstation } from '@/services/api/opdWorkstation';
import type {
  ExamCatalogItem,
  IcdDiagnosis,
  OpdWorkstationView,
} from '@/types/opdWorkstation';

/**
 * 与后端 searchIcd 同规则的前端过滤：名称/ICD编码/拼音码，不区分大小写。
 * keyword 为空时返回全量。纯函数，不修改入参。
 */
export function filterIcd(diagnoses: IcdDiagnosis[], keyword: string): IcdDiagnosis[] {
  const kw = (keyword ?? '').trim().toLowerCase();
  if (!diagnoses || diagnoses.length === 0) return [];
  if (!kw) return diagnoses;
  return diagnoses.filter((d) =>
    d.name.toLowerCase().includes(kw) ||
    d.icdCode.toLowerCase().includes(kw) ||
    (d.pyCode ?? '').toLowerCase().includes(kw),
  );
}

interface OpdWorkstationState {
  loading: boolean;
  error: string | null;
  demo: boolean;
  updatedAt: string | null;
  templates: OpdWorkstationView['templates'];
  prescriptions: OpdWorkstationView['prescriptions'];
  diagnoses: IcdDiagnosis[];
  catalog: ExamCatalogItem[];

  /** ICD 搜索关键字 */
  keyword: string;
  setKeyword: (kw: string) => void;
  /** 当前带入病历的模板片段 */
  activeSnippet: string | null;
  applyTemplate: (snippet: string) => void;
  /** 已勾选开立的检查检验 */
  selectedItemIds: string[];
  toggleCatalogItem: (itemId: string) => void;

  load: () => Promise<void>;
}

export const useOpdWorkstationStore = create<OpdWorkstationState>((set) => ({
  loading: false,
  error: null,
  demo: false,
  updatedAt: null,
  templates: [],
  prescriptions: [],
  diagnoses: [],
  catalog: [],

  keyword: '',
  setKeyword: (kw) => set({ keyword: kw }),
  activeSnippet: null,
  applyTemplate: (snippet) => set({ activeSnippet: snippet }),
  selectedItemIds: [],
  toggleCatalogItem: (itemId) =>
    set((s) => ({
      selectedItemIds: s.selectedItemIds.includes(itemId)
        ? s.selectedItemIds.filter((id) => id !== itemId)
        : [...s.selectedItemIds, itemId],
    })),

  load: async () => {
    set({ loading: true, error: null });
    try {
      const view = await getOpdWorkstation();
      set({
        demo: view.demo,
        updatedAt: view.updatedAt,
        templates: view.templates,
        prescriptions: view.prescriptions,
        diagnoses: view.diagnoses,
        catalog: view.catalog,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '门诊医生站加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
