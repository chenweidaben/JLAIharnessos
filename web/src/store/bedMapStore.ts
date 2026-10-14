/**
 * 健澜科技 jlmedaios - 全院床位图 Zustand store
 *
 * 拉取 GET /bed-map，按楼层/房号分组成房间网格供大屏渲染。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { create } from 'zustand';
import { getBedMap } from '@/services/api/bedMap';
import type { BedMapRow, BedMapSummary, RoomGroup } from '@/types/bedMap';

/** 与后端 groupByRoom 一致的前端分组（纯函数）：楼层 -> 房号 -> 床位 */
export function groupBedsByRoom(beds: BedMapRow[]): RoomGroup[] {
  const map = new Map<string, RoomGroup>();
  for (const bed of beds) {
    const key = `${bed.floor}||${bed.roomNo}||${bed.wardId}`;
    let g = map.get(key);
    if (!g) {
      g = {
        key,
        floor: bed.floor,
        roomNo: bed.roomNo,
        wardId: bed.wardId,
        wardName: bed.wardName,
        department: bed.department,
        beds: [],
      };
      map.set(key, g);
    }
    g.beds.push(bed);
  }
  const collator = new Intl.Collator('zh-Hans-CN', { numeric: true });
  const groups = [...map.values()];
  for (const g of groups) g.beds.sort((a, b) => collator.compare(a.bedNo, b.bedNo));
  groups.sort(
    (a, b) =>
      collator.compare(a.floor, b.floor) || collator.compare(a.roomNo, b.roomNo),
  );
  return groups;
}

interface BedMapState {
  loading: boolean;
  error: string | null;
  demo: boolean;
  rows: BedMapRow[];
  summary: BedMapSummary | null;
  updatedAt: string | null;
  load: () => Promise<void>;
}

export const useBedMapStore = create<BedMapState>((set) => ({
  loading: false,
  error: null,
  demo: false,
  rows: [],
  summary: null,
  updatedAt: null,

  load: async () => {
    set({ loading: true, error: null });
    try {
      const view = await getBedMap();
      set({
        demo: view.demo,
        rows: view.rows,
        summary: view.summary,
        updatedAt: view.updatedAt,
      });
    } catch (err) {
      set({ error: err instanceof Error ? err.message : '床位图加载失败' });
    } finally {
      set({ loading: false });
    }
  },
}));
