/**
 * 健澜科技 jlmedaios - 抗菌药物管理（AMS）store（M14-A）
 *
 * 健康门禁 + 目录/授权 + 特殊使用级审批 + 围术期/专项点评 + 不合理看板 + 质控指标。
 * 写操作失败 set error 并 rethrow（页面 fire-and-forget 用 run() 吞 rethrow，错误由 Alert 展示）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/ams';
import type {
  AmxCheckResult,
  AmxMetricsResponse,
  AmxReview,
  AmxUsageRecord,
  AntibioticCatalogItem,
  AtcLevel,
  PrescriberGrant,
  SpecialApproval,
} from '@/types/ams';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface AmsState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;

  catalog: AntibioticCatalogItem[];
  prescribers: PrescriberGrant[];
  pendingApprovals: SpecialApproval[];
  reviews: AmxReview[];
  irrationalReviews: AmxReview[];
  usageList: AmxUsageRecord[];
  metrics: AmxMetricsResponse | null;

  checkHealth: () => Promise<boolean>;
  loadCatalog: () => Promise<void>;
  loadPrescribers: () => Promise<void>;
  grantPrescriber: (prescriberId: string, maxLevel: AtcLevel) => Promise<void>;
  createSpecialApproval: (body: {
    visitId: string;
    drugId: string;
    indication: string;
  }) => Promise<void>;
  loadPendingApprovals: () => Promise<void>;
  approveSpecial: (id: string, opinion: string, consultantId?: string) => Promise<void>;
  rejectSpecial: (id: string, reason: string) => Promise<void>;
  createReview: (body: Record<string, unknown>) => Promise<void>;
  loadReviews: () => Promise<void>;
  loadIrrational: () => Promise<void>;
  signReview: (id: string, note?: string) => Promise<void>;
  returnReview: (id: string, reason: string) => Promise<void>;
  recordUsage: (body: Record<string, unknown>) => Promise<void>;
  loadUsage: () => Promise<void>;
  loadMetrics: (from: string, to: string) => Promise<void>;
  checkRules: (body: Record<string, unknown>) => Promise<AmxCheckResult>;
}

export const useAmsStore = create<AmsState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,

  catalog: [],
  prescribers: [],
  pendingApprovals: [],
  reviews: [],
  irrationalReviews: [],
  usageList: [],
  metrics: null,

  checkHealth: async () => {
    set({ healthChecking: true });
    try {
      const health = await getSystemHealth();
      const dbUp = health.db === 'up';
      set({ dbUp, healthChecking: false, error: null });
      return dbUp;
    } catch (e) {
      set({ dbUp: false, healthChecking: false, error: `BFF/数据库连接失败：${errMsg(e)}` });
      return false;
    }
  },

  async loadCatalog() {
    set({ loading: true, error: null });
    try {
      set({ catalog: await api.listCatalog(), loading: false });
    } catch (e) {
      set({ error: `加载抗菌药目录失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadPrescribers() {
    set({ loading: true, error: null });
    try {
      set({ prescribers: await api.listPrescribers(), loading: false });
    } catch (e) {
      set({ error: `加载处方授权列表失败：${errMsg(e)}`, loading: false });
    }
  },

  async grantPrescriber(prescriberId, maxLevel) {
    set({ error: null });
    try {
      await api.grantPrescriber({ prescriberId, maxLevel });
      await get().loadPrescribers();
    } catch (e) {
      set({ error: `授予处方权限失败：${errMsg(e)}` });
      throw e;
    }
  },

  async createSpecialApproval(body) {
    set({ error: null });
    try {
      await api.createSpecialApproval(body);
      await get().loadPendingApprovals();
    } catch (e) {
      set({ error: `提交特殊使用级申请失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadPendingApprovals() {
    set({ loading: true, error: null });
    try {
      set({ pendingApprovals: await api.listSpecialApprovals({ status: 'pending' }), loading: false });
    } catch (e) {
      set({ error: `加载待审批特殊使用级失败：${errMsg(e)}`, loading: false });
    }
  },

  async approveSpecial(id, opinion, consultantId) {
    set({ error: null });
    try {
      await api.approveSpecialApproval(id, {
        consultationOpinion: opinion,
        ...(consultantId ? { consultantId } : {}),
      });
      await get().loadPendingApprovals();
    } catch (e) {
      set({ error: `特殊使用级审批失败：${errMsg(e)}` });
      throw e;
    }
  },

  async rejectSpecial(id, reason) {
    set({ error: null });
    try {
      await api.rejectSpecialApproval(id, { reason });
      await get().loadPendingApprovals();
    } catch (e) {
      set({ error: `驳回特殊使用级失败：${errMsg(e)}` });
      throw e;
    }
  },

  async createReview(body) {
    set({ error: null });
    try {
      await api.createReview(body as Parameters<typeof api.createReview>[0]);
      await Promise.all([get().loadReviews(), get().loadIrrational()]);
    } catch (e) {
      set({ error: `提交点评失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadReviews() {
    set({ loading: true, error: null });
    try {
      set({ reviews: await api.listReviews(), loading: false });
    } catch (e) {
      set({ error: `加载点评列表失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadIrrational() {
    set({ error: null });
    try {
      // 后端不支持 result 过滤，取全部点评后客户端仅保留不合理项。
      const all = await api.listReviews();
      set({ irrationalReviews: all.filter((r) => r.result === 'irrational') });
    } catch (e) {
      set({ error: `加载不合理用药看板失败：${errMsg(e)}` });
    }
  },

  async signReview(id, note) {
    set({ error: null });
    try {
      await api.signReview(id, note);
      await Promise.all([get().loadReviews(), get().loadIrrational()]);
    } catch (e) {
      set({ error: `点评签名失败：${errMsg(e)}` });
      throw e;
    }
  },

  async returnReview(id, reason) {
    set({ error: null });
    try {
      await api.returnReview(id, reason);
      await Promise.all([get().loadReviews(), get().loadIrrational()]);
    } catch (e) {
      set({ error: `退回点评失败：${errMsg(e)}` });
      throw e;
    }
  },

  async recordUsage(body) {
    set({ error: null });
    try {
      await api.recordUsage(body as Parameters<typeof api.recordUsage>[0]);
      await get().loadUsage();
    } catch (e) {
      set({ error: `记录抗菌药使用失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadUsage() {
    set({ error: null });
    try {
      set({ usageList: await api.listUsage() });
    } catch (e) {
      set({ error: `加载使用记录失败：${errMsg(e)}` });
    }
  },

  async loadMetrics(from, to) {
    set({ loading: true, error: null });
    try {
      set({ metrics: await api.getAmsMetrics(from, to), loading: false });
    } catch (e) {
      set({ error: `加载抗菌药质控指标失败：${errMsg(e)}`, loading: false });
    }
  },

  async checkRules(body) {
    set({ error: null });
    try {
      return await api.checkRules(body as Parameters<typeof api.checkRules>[0]);
    } catch (e) {
      set({ error: `规则预检失败：${errMsg(e)}` });
      throw e;
    }
  },
}));
