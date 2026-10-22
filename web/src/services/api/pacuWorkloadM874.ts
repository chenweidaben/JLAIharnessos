/**
 * 健澜科技 jlmedaios - PACU 管理 API（M874）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface PacuWorkload {
  id: string;
  date: string;
  admitted: number;
  discharged: number;
  avgStayMin: number;
  delayedExtubation: number;
  status: string;
  aldrete: string;
  delayedWake: string;
  ponv: string;
  painNrs: string;
  readmission: string;
}

const DEMO: PacuWorkload[] = [
  {
    id: 'PACU-874',
    date: '2026-10-22',
    admitted: 30,
    discharged: 28,
    avgStayMin: 45,
    delayedExtubation: 2,
    status: '正常运行',
    aldrete: 'Aldrete 评分：入室平均 7.8；出室平均 9.2；出室评分 ≥9 占 92.9%。',
    delayedWake: '苏醒延迟（>30min）：2 例（均为老年全麻术后，已观察至清醒后出室）。',
    ponv: '术后恶心呕吐（PONV）：4 例（13.3%）；已用昂丹司琼处理，均缓解。',
    painNrs: '疼痛评分（NRS）：入室平均 4.5；出室平均 2.1；NRS ≥7 重度疼痛 2 例（已追加镇痛）。',
    readmission: '再入室率：0 例（0%）；PACU 停留超时（>2h）1 例。',
  },
];

export interface PacuWorkloadListResult {
  items: PacuWorkload[];
  demo: boolean;
}

export async function fetchPacuWorkload(): Promise<PacuWorkloadListResult> {
  try {
    const res = await get<{ items: PacuWorkload[] }>('/pacu/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
