/**
 * 健澜科技 jlmedaios - AI 移动护理（PDA 执行端）状态管理（M16-A，Zustand）
 *
 * 全部数据来自真实 BFF（services/api/mobileNursing），无 mock：
 *  - 启动先探活 /system/health（复用 care.getSystemHealth），BFF/数据库不可用时 dbUp=false
 *    并显式报错，红色 Alert + 水印 + 不渲染业务数据（不假数据）；
 *  - 床旁看板 / 扫码定位 / 五重核对 / 给药 / 体征 / 任务 / 量表 / 记录 / SBAR 按病区异步加载；
 *  - 写操作经健康门禁，失败 set error 并 rethrow（不吞、不假成功）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { create } from 'zustand';

import * as api from '@/services/api/mobileNursing';
import { getSystemHealth } from '@/services/api/care';
import type { CareHealth } from '@/types/care';
import type {
  AssessmentSavePayload,
  BedBoardPatient,
  BedBoardView,
  BedsideAdministerPayload,
  BedsideRecordPayload,
  ScanResult,
  SbarDraft,
  SbarSignPayload,
  FiveRightsResult,
  VitalsCapturePayload,
} from '@/types/mobileNursing';

interface MobileNursingState {
  /** 后端 DB 是否就绪：null=探测中 / true=就绪 / false=不可用 */
  dbUp: boolean | null;
  health: CareHealth | null;
  deptCode: string;

  patients: BedBoardPatient[];
  scanResult: ScanResult | null;
  fiveRights: FiveRightsResult | null;
  sbarDraft: SbarDraft | null;

  loadingHealth: boolean;
  loadingBoard: boolean;
  scanning: boolean;
  acting: boolean;
  error: string | null;

  checkHealth: () => Promise<boolean>;
  setDept: (code: string) => void;
  loadBoard: () => Promise<void>;
  scan: (code: string) => Promise<ScanResult>;
  verifyMedication: (orderId: string, body: BedsideAdministerPayload) => Promise<FiveRightsResult>;
  administer: (orderId: string, body: BedsideAdministerPayload) => Promise<unknown>;
  captureVitals: (body: VitalsCapturePayload) => Promise<unknown>;
  executeTask: (taskId: string, result?: string) => Promise<unknown>;
  saveAssessment: (body: AssessmentSavePayload) => Promise<unknown>;
  createRecord: (body: BedsideRecordPayload) => Promise<unknown>;
  loadSbar: (shift: 'day' | 'night') => Promise<void>;
  signSbar: (body: SbarSignPayload) => Promise<unknown>;
}

const errMsg = (e: unknown, fallback: string): string =>
  e instanceof Error ? e.message : fallback;

export const useMobileNursingStore = create<MobileNursingState>((set, get) => {
  const requireReady = (): void => {
    if (get().dbUp !== true) {
      throw new Error('BFF 或数据库不可用，禁止写操作');
    }
  };

  return {
    dbUp: null,
    health: null,
    deptCode: '',

    patients: [],
    scanResult: null,
    fiveRights: null,
    sbarDraft: null,

    loadingHealth: false,
    loadingBoard: false,
    scanning: false,
    acting: false,
    error: null,

    checkHealth: async () => {
      set({ loadingHealth: true, error: null });
      try {
        const health = await getSystemHealth();
        const up = health.db === 'up' || health.db === 'skipped';
        set({ health, dbUp: up, loadingHealth: false });
        return up;
      } catch (e) {
        set({ dbUp: false, loadingHealth: false, error: errMsg(e, 'BFF 或数据库不可用') });
        return false;
      }
    },

    setDept: (code) => {
      set({ deptCode: code });
    },

    loadBoard: async () => {
      set({ loadingBoard: true, error: null });
      try {
        const view: BedBoardView = await api.getBedBoard(get().deptCode || undefined);
        set({ patients: view.patients, deptCode: view.deptCode || get().deptCode, loadingBoard: false });
      } catch (e) {
        set({ loadingBoard: false, error: errMsg(e, '床位看板加载失败') });
      }
    },

    scan: async (code) => {
      requireReady();
      set({ scanning: true, error: null });
      try {
        const r = await api.scanCode(code);
        set({ scanResult: r, scanning: false });
        return r;
      } catch (e) {
        set({ scanning: false, error: errMsg(e, '扫码识别失败') });
        throw e;
      }
    },

    verifyMedication: async (orderId, body) => {
      requireReady();
      try {
        const r = await api.verifyMedication(orderId, body);
        set({ fiveRights: r });
        return r;
      } catch (e) {
        set({ error: errMsg(e, '五重核对失败') });
        throw e;
      }
    },

    administer: async (orderId, body) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        const r = await api.scanAndAdminister(orderId, body);
        return r;
      } catch (e) {
        set({ error: errMsg(e, '给药失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    captureVitals: async (body) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.captureVitals(body);
      } catch (e) {
        set({ error: errMsg(e, '体征采集失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    executeTask: async (taskId, result) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.executeBedsideTask(taskId, { result });
      } catch (e) {
        set({ error: errMsg(e, '任务执行失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    saveAssessment: async (body) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.saveAssessment(body);
      } catch (e) {
        set({ error: errMsg(e, '评估保存失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    createRecord: async (body) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.createBedsideRecord(body);
      } catch (e) {
        set({ error: errMsg(e, '护理记录保存失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },

    loadSbar: async (shift) => {
      if (!get().deptCode) return;
      set({ error: null });
      try {
        const draft = await api.getSbar(get().deptCode, shift);
        set({ sbarDraft: draft });
      } catch (e) {
        set({ error: errMsg(e, '交班草稿加载失败') });
        throw e;
      }
    },

    signSbar: async (body) => {
      requireReady();
      set({ acting: true, error: null });
      try {
        return await api.signSbar(body);
      } catch (e) {
        set({ error: errMsg(e, '交班签名失败') });
        throw e;
      } finally {
        set({ acting: false });
      }
    },
  };
});
