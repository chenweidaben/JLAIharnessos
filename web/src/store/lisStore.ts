/**
 * 健澜科技 jlmedaios - LIS 检验全流程 store（M11-A）
 *
 * zustand，仿 bloodQualityStore。承载目录加载、申请创建/查询/取消、
 * 标本生成/采集/签收/拒收、报告创建/结果录入/提交/审核/退回/发布/查询。
 * 写操作失败时 set error 并 rethrow，供页面/用例断言（自审被拒等）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/lis';
import type {
  LabItem,
  LabOrderItem,
  LabPanel,
  LabReport,
  LabRequest,
  LabRequestDetail,
  LabSpecimen,
  Urgency,
} from '@/types/lis';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface LisState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;

  panels: LabPanel[];
  items: LabItem[];
  requests: LabRequest[];
  specimens: LabSpecimen[];
  reports: LabReport[];
  requestDetail: LabRequestDetail | null;
  reportDetail: LabReport | null;

  checkHealth: () => Promise<boolean>;
  loadCatalog: () => Promise<void>;
  createRequest: (body: {
    visitId: string;
    patientId: string;
    urgency: Urgency;
    diagnosis?: string;
    note?: string;
    items: LabOrderItem[];
  }) => Promise<LabRequest>;
  loadRequests: () => Promise<void>;
  loadRequestDetail: (id: string) => Promise<void>;
  cancelRequest: (id: string, reason: string) => Promise<void>;

  generateSpecimens: (requestId: string) => Promise<void>;
  loadSpecimens: () => Promise<void>;
  collectSpecimen: (id: string, collectionSite: string) => Promise<void>;
  receiveSpecimen: (id: string) => Promise<void>;
  rejectSpecimen: (id: string, reason: string) => Promise<void>;

  createReport: (requestId: string, panelId: string) => Promise<void>;
  enterResults: (reportId: string, results: { itemId: string; value: string }[]) => Promise<void>;
  submitReport: (id: string) => Promise<void>;
  approveReport: (id: string) => Promise<void>;
  returnReport: (id: string, reason: string) => Promise<void>;
  publishReport: (id: string) => Promise<void>;
  loadReports: () => Promise<void>;
  loadReportDetail: (id: string) => Promise<void>;
}

export const useLisStore = create<LisState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,

  panels: [],
  items: [],
  requests: [],
  specimens: [],
  reports: [],
  requestDetail: null,
  reportDetail: null,

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
      const [panels, items] = await Promise.all([api.listPanels(), api.listItems()]);
      set({ panels, items, loading: false });
    } catch (e) {
      set({ error: `加载检验目录失败：${errMsg(e)}`, loading: false });
    }
  },

  async createRequest(body) {
    set({ error: null });
    const requestNo = api.genRequestNo();
    try {
      const created = await api.createRequest({ ...body, requestNo });
      await get().loadRequests();
      return created;
    } catch (e) {
      set({ error: `检验申请创建失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadRequests() {
    set({ loading: true, error: null });
    try {
      set({ requests: await api.listRequests(), loading: false });
    } catch (e) {
      set({ error: `加载检验申请失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadRequestDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ requestDetail: await api.getRequestDetail(id), loading: false });
    } catch (e) {
      set({ error: `加载申请详情失败：${errMsg(e)}`, loading: false });
    }
  },

  async cancelRequest(id, reason) {
    set({ error: null });
    try {
      await api.cancelRequest(id, reason);
      await get().loadRequests();
      await get().loadRequestDetail(id);
    } catch (e) {
      set({ error: `取消申请失败：${errMsg(e)}` });
      throw e;
    }
  },

  async generateSpecimens(requestId) {
    set({ error: null });
    try {
      await api.generateSpecimens(requestId);
      await get().loadSpecimens();
      await get().loadRequestDetail(requestId);
    } catch (e) {
      set({ error: `生成标本失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadSpecimens() {
    set({ loading: true, error: null });
    try {
      set({ specimens: await api.listSpecimens(), loading: false });
    } catch (e) {
      set({ error: `加载标本失败：${errMsg(e)}`, loading: false });
    }
  },

  async collectSpecimen(id, collectionSite) {
    set({ error: null });
    try {
      await api.collectSpecimen(id, collectionSite);
      await get().loadSpecimens();
    } catch (e) {
      set({ error: `标本采集失败：${errMsg(e)}` });
      throw e;
    }
  },

  async receiveSpecimen(id) {
    set({ error: null });
    try {
      await api.receiveSpecimen(id);
      await get().loadSpecimens();
    } catch (e) {
      set({ error: `标本签收失败：${errMsg(e)}` });
      throw e;
    }
  },

  async rejectSpecimen(id, reason) {
    set({ error: null });
    try {
      await api.rejectSpecimen(id, reason);
      await get().loadSpecimens();
    } catch (e) {
      set({ error: `标本拒收失败：${errMsg(e)}` });
      throw e;
    }
  },

  async createReport(requestId, panelId) {
    set({ error: null });
    try {
      const report = await api.createReport(requestId, panelId);
      await get().loadReports();
      await get().loadReportDetail(report.id);
    } catch (e) {
      set({ error: `创建报告失败：${errMsg(e)}` });
      throw e;
    }
  },

  async enterResults(reportId, results) {
    set({ error: null });
    try {
      await api.enterResults(reportId, { results });
      await get().loadReportDetail(reportId);
    } catch (e) {
      set({ error: `结果录入失败：${errMsg(e)}` });
      throw e;
    }
  },

  async submitReport(id) {
    set({ error: null });
    try {
      await api.submitReport(id);
      await get().loadReportDetail(id);
      await get().loadReports();
    } catch (e) {
      set({ error: `提交审核失败：${errMsg(e)}` });
      throw e;
    }
  },

  async approveReport(id) {
    set({ error: null });
    try {
      await api.approveReport(id);
      await get().loadReportDetail(id);
      await get().loadReports();
    } catch (e) {
      set({ error: `报告审核失败：${errMsg(e)}` });
      throw e;
    }
  },

  async returnReport(id, reason) {
    set({ error: null });
    try {
      await api.returnReport(id, reason);
      await get().loadReportDetail(id);
      await get().loadReports();
    } catch (e) {
      set({ error: `报告退回失败：${errMsg(e)}` });
      throw e;
    }
  },

  async publishReport(id) {
    set({ error: null });
    try {
      await api.publishReport(id);
      await get().loadReportDetail(id);
      await get().loadReports();
    } catch (e) {
      set({ error: `报告发布失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadReports() {
    set({ loading: true, error: null });
    try {
      set({ reports: await api.listReports(), loading: false });
    } catch (e) {
      set({ error: `加载报告失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadReportDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ reportDetail: await api.getReportDetail(id), loading: false });
    } catch (e) {
      set({ error: `加载报告详情失败：${errMsg(e)}`, loading: false });
    }
  },
}));
