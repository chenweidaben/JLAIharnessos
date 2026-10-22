/**
 * 健澜科技 jlmedaios - 手术室管理 API（M873）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface OperatingRoomWorkload {
  id: string;
  date: string;
  rooms: number;
  cases: number;
  emergencyCases: number;
  turnoverMin: number;
  status: string;
  roomBreakdown: { name: string; count: number }[];
  levelBreakdown: { name: string; count: number }[];
  anesthesiaBreakdown: { name: string; count: number }[];
  cancellationReasons: string;
}

const DEMO: OperatingRoomWorkload[] = [
  {
    id: 'OR-873',
    date: '2026-10-22',
    rooms: 8,
    cases: 32,
    emergencyCases: 6,
    turnoverMin: 22,
    status: '正常运行',
    roomBreakdown: [
      { name: 'OR1（普外科）', count: 8 },
      { name: 'OR2（骨科）', count: 8 },
      { name: 'OR3（妇产）', count: 8 },
      { name: 'OR4（神外/胸外）', count: 4 },
      { name: 'OR5（泌尿）', count: 2 },
      { name: 'OR6（腔镜）', count: 2 },
    ],
    levelBreakdown: [
      { name: 'Ⅰ级（简单）', count: 4 },
      { name: 'Ⅱ级（中等）', count: 12 },
      { name: 'Ⅲ级（复杂）', count: 12 },
      { name: 'Ⅳ级（特大）', count: 4 },
    ],
    anesthesiaBreakdown: [
      { name: '全麻', count: 20 },
      { name: '椎管内麻醉', count: 6 },
      { name: '神经阻滞', count: 4 },
      { name: '局麻', count: 2 },
    ],
    cancellationReasons: '手术取消原因：患者原因 2（发热/未禁食）；病情变化 1；设备故障 0；其他 1。',
  },
];

export interface OperatingRoomWorkloadListResult {
  items: OperatingRoomWorkload[];
  demo: boolean;
}

export async function fetchOperatingRoomWorkload(): Promise<OperatingRoomWorkloadListResult> {
  try {
    const res = await get<{ items: OperatingRoomWorkload[] }>('/operating-room/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
