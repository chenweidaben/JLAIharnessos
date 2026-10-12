/**
 * 健澜科技 jlmedaios - 管路护理 Zustand store（M17-C）
 *
 * 健康门禁：db!=='up' 时不渲染业务数据、拒绝写操作。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getSystemHealth } from '@/services/api/care';
import { getExtubationMetrics, insertTube, listTubes, removeTube } from '@/services/api/tubeCare';
import type { ExtubationMetrics, InsertTubeReq, RemoveTubeReq, Tube } from '@/types/tubeCare';

interface HealthInfo { status: string; version: string; demoMode: boolean; db: 'up' | 'down' | 'skipped'; }

interface TubeCareState {
  dbUp: boolean | null;
  health: HealthInfo | null;
  tubes: Tube[];
  metrics: ExtubationMetrics | null;
  loading: boolean;
  acting: boolean;
  error: string | null;
  checkHealth: () => Promise<boolean>;
  loadTubes: (visitId?: string) => Promise<void>;
  loadMetrics: () => Promise<void>;
  insert: (body: InsertTubeReq) => Promise<Tube>;
  remove: (id: string, body: RemoveTubeReq) => Promise<Tube>;
}

export const useTubeCareStore = create<TubeCareState>((set, get) => ({
  dbUp: null,
  health: null,
  tubes: [],
  metrics: null,
  loading: false,
  acting: false,
  error: null,

  checkHealth: async () => {
    try {
      const h = await getSystemHealth() as HealthInfo;
      const up = h && h.db === 'up';
      set({ dbUp: up, health: h, error: up ? null : '数据库连接异常，业务数据不可用' });
      return up;
    } catch (err) {
      set({ dbUp: false, health: null, error: err instanceof Error ? err.message : '健康检查失败' });
      return false;
    }
  },

  loadTubes: async (visitId?: string) => {
    set({ loading: true, error: null });
    try {
      const rows = await listTubes(visitId ? { visitId } : {});
      set({ tubes: rows });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载管路失败' });
    } finally {
      set({ loading: false });
    }
  },

  loadMetrics: async () => {
    try {
      const m = await getExtubationMetrics();
      set({ metrics: m });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '加载指标失败' });
    }
  },

  insert: async (body) => {
    if (get().dbUp !== true) throw new Error('数据库不可用，禁止操作');
    set({ acting: true, error: null });
    try {
      const t = await insertTube(body);
      await get().loadTubes();
      return t;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '置入失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },

  remove: async (id, body) => {
    if (get().dbUp !== true) throw new Error('数据库不可用，禁止操作');
    set({ acting: true, error: null });
    try {
      const t = await removeTube(id, body);
      await get().loadTubes();
      return t;
    } catch (err) {
      const msg = err instanceof Error ? err.message : '拔管失败';
      set({ error: msg });
      throw err;
    } finally {
      set({ acting: false });
    }
  },
}));
