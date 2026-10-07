/**
 * 健澜科技 jlmedaios - RIS/PACS 检查全流程 store（M11-B）
 *
 * zustand，仿 lisStore。承载目录/申请/预约/到检/执行/报告/AI 辅助/查询。
 * 写操作失败时 set error 并 rethrow，供页面/用例断言（自审 409、约满 409 等）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';
import { getSystemHealth } from '../services/api/pharmacy';
import * as api from '../services/api/ris';
import type {
  ImagingAppointment,
  ImagingDevice,
  ImagingDeviceSlot,
  ImagingExam,
  ImagingReport,
  ImagingRequest,
  ImagingRequestDetail,
  ImagingStudy,
  Urgency,
} from '@/types/ris';

function errMsg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

interface RisState {
  dbUp: boolean;
  healthChecking: boolean;
  loading: boolean;
  error: string | null;

  exams: ImagingExam[];
  devices: ImagingDevice[];
  slots: ImagingDeviceSlot[];
  requests: ImagingRequest[];
  requestDetail: ImagingRequestDetail | null;
  appointments: ImagingAppointment[];
  studies: ImagingStudy[];
  reports: ImagingReport[];
  reportDetail: ImagingReport | null;

  checkHealth: () => Promise<boolean>;
  loadCatalog: () => Promise<void>;
  loadDevices: () => Promise<void>;
  loadSlots: (deviceId?: string, date?: string) => Promise<void>;

  createRequest: (body: {
    visitId: string;
    patientId: string;
    urgency: Urgency;
    diagnosis?: string;
    chiefComplaint?: string;
    examIds: string[];
  }) => Promise<ImagingRequest>;
  loadRequests: () => Promise<void>;
  loadRequestDetail: (id: string) => Promise<void>;
  cancelRequest: (id: string, reason: string) => Promise<void>;

  createAppointment: (body: { requestId: string; examId: string; slotId: string }) => Promise<void>;
  loadAppointments: () => Promise<void>;
  checkinAppointment: (id: string) => Promise<void>;
  cancelAppointment: (id: string) => Promise<void>;

  performAppointment: (id: string, studyUid: string) => Promise<void>;
  loadStudies: () => Promise<void>;
  addStudyImages: (studyId: string, imageRefs: string[]) => Promise<void>;

  createStudyReport: (studyId: string) => Promise<void>;
  loadReportDetail: (id: string) => Promise<void>;
  saveReportDraft: (reportId: string, findings: string, impression: string) => Promise<void>;
  aiAssist: (reportId: string) => Promise<void>;
  submitReport: (id: string) => Promise<void>;
  approveReport: (id: string) => Promise<void>;
  returnReport: (id: string, reason: string) => Promise<void>;
  publishReport: (id: string) => Promise<void>;
  loadReports: () => Promise<void>;
}

export const useRisStore = create<RisState>((set, get) => ({
  dbUp: false,
  healthChecking: false,
  loading: false,
  error: null,

  exams: [],
  devices: [],
  slots: [],
  requests: [],
  requestDetail: null,
  appointments: [],
  studies: [],
  reports: [],
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
      const [exams, devices] = await Promise.all([api.listExams(), api.listDevices()]);
      set({ exams, devices, loading: false });
    } catch (e) {
      set({ error: `加载检查目录失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadDevices() {
    set({ error: null });
    try {
      set({ devices: await api.listDevices() });
    } catch (e) {
      set({ error: `加载设备失败：${errMsg(e)}` });
    }
  },

  async loadSlots(deviceId, date) {
    set({ loading: true, error: null });
    try {
      set({ slots: await api.listSlots({ deviceId, date }), loading: false });
    } catch (e) {
      set({ error: `加载时段失败：${errMsg(e)}`, loading: false });
    }
  },

  async createRequest(body) {
    set({ error: null });
    const requestNo = api.genRequestNo();
    try {
      const created = await api.createImagingRequest({
        requestNo,
        visitId: body.visitId,
        patientId: body.patientId,
        urgency: body.urgency,
        diagnosis: body.diagnosis,
        chiefComplaint: body.chiefComplaint,
        items: body.examIds.map((examId) => ({ examId })),
      });
      await get().loadRequests();
      return created;
    } catch (e) {
      set({ error: `检查申请创建失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadRequests() {
    set({ loading: true, error: null });
    try {
      set({ requests: await api.listImagingRequests(), loading: false });
    } catch (e) {
      set({ error: `加载检查申请失败：${errMsg(e)}`, loading: false });
    }
  },

  async loadRequestDetail(id) {
    set({ loading: true, error: null });
    try {
      set({ requestDetail: await api.getImagingRequestDetail(id), loading: false });
    } catch (e) {
      set({ error: `加载申请详情失败：${errMsg(e)}`, loading: false });
    }
  },

  async cancelRequest(id, reason) {
    set({ error: null });
    try {
      await api.cancelImagingRequest(id, reason);
      await get().loadRequests();
      await get().loadRequestDetail(id);
    } catch (e) {
      set({ error: `取消申请失败：${errMsg(e)}` });
      throw e;
    }
  },

  async createAppointment(body) {
    set({ error: null });
    const appointmentNo = api.genAppointmentNo();
    try {
      await api.createAppointment({ appointmentNo, ...body });
      await get().loadAppointments();
    } catch (e) {
      set({ error: `预约失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadAppointments() {
    set({ loading: true, error: null });
    try {
      set({ appointments: await api.listAppointments(), loading: false });
    } catch (e) {
      set({ error: `加载预约失败：${errMsg(e)}`, loading: false });
    }
  },

  async checkinAppointment(id) {
    set({ error: null });
    try {
      await api.checkinAppointment(id);
      await get().loadAppointments();
    } catch (e) {
      set({ error: `到检登记失败：${errMsg(e)}` });
      throw e;
    }
  },

  async cancelAppointment(id) {
    set({ error: null });
    try {
      await api.cancelAppointment(id);
      await get().loadAppointments();
    } catch (e) {
      set({ error: `取消预约失败：${errMsg(e)}` });
      throw e;
    }
  },

  async performAppointment(id, studyUid) {
    set({ error: null });
    try {
      await api.performAppointment(id, studyUid);
      await get().loadAppointments();
      await get().loadStudies();
    } catch (e) {
      set({ error: `执行检查失败：${errMsg(e)}` });
      throw e;
    }
  },

  async loadStudies() {
    set({ loading: true, error: null });
    try {
      set({ studies: await api.listStudies(), loading: false });
    } catch (e) {
      set({ error: `加载检查执行记录失败：${errMsg(e)}`, loading: false });
    }
  },

  async addStudyImages(studyId, imageRefs) {
    set({ error: null });
    try {
      await api.addStudyImages(studyId, { imageRefs });
      await get().loadStudies();
    } catch (e) {
      set({ error: `登记图像失败：${errMsg(e)}` });
      throw e;
    }
  },

  async createStudyReport(studyId) {
    set({ error: null });
    const reportNo = api.genReportNo();
    try {
      const report = await api.createStudyReport(studyId, reportNo);
      await get().loadReports();
      await get().loadReportDetail(report.id);
    } catch (e) {
      set({ error: `创建报告失败：${errMsg(e)}` });
      throw e;
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

  async saveReportDraft(reportId, findings, impression) {
    set({ error: null });
    try {
      await api.saveReportDraft(reportId, {
        findings: findings || undefined,
        impression: impression || undefined,
      });
      await get().loadReportDetail(reportId);
    } catch (e) {
      set({ error: `保存草稿失败：${errMsg(e)}` });
      throw e;
    }
  },

  async aiAssist(reportId) {
    set({ error: null });
    try {
      const report = await api.aiAssistReport(reportId);
      set({ reportDetail: report });
    } catch (e) {
      set({ error: `AI 辅助失败：${errMsg(e)}` });
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
}));
