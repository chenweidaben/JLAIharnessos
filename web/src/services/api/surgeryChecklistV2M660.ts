/**
 * 健澜科技 jlmedaios - 手术核查表 v2 API（M660，配套 M551）
 *
 * 对接 BFF：GET /api/v1/surgery/checklists
 *   （未注册则 DEMO 兜底，打标 demo:true）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface SurgeryChecklist {
  id: string;
  surgeryId: string;
  patientId: string;
  surgeryName: string;
  signIn: { done: boolean; at: string; note: string };
  timeOut: { done: boolean; at: string; note: string };
  signOut: { done: boolean; at: string; note: string };
  surgeon: string;
  anesthesiologist: string;
  nurse: string;
}

const DEMO_CHECKLISTS: SurgeryChecklist[] = [
  {
    id: 'SC-001',
    surgeryId: 'S-2601',
    patientId: 'P10002',
    surgeryName: '腹腔镜胆囊切除术',
    signIn: { done: true, at: '2026-10-21T08:30:00+08:00', note: '患者身份、手术部位、过敏史、气道评估已确认。' },
    timeOut: { done: true, at: '2026-10-21T09:00:00+08:00', note: '团队已互相介绍，手术步骤、抗生素、影像已核对。' },
    signOut: { done: true, at: '2026-10-21T10:35:00+08:00', note: '器械纱布点数正确，标本已贴标签。' },
    surgeon: '刘主任',
    anesthesiologist: '陈麻醉',
    nurse: '周敏',
  },
  {
    id: 'SC-002',
    surgeryId: 'S-2602',
    patientId: 'P10005',
    surgeryName: '冠状动脉支架植入术',
    signIn: { done: true, at: '2026-10-20T13:30:00+08:00', note: '术中肝素化方案已确认。' },
    timeOut: { done: true, at: '2026-10-20T14:00:00+08:00', note: '造影剂过敏、支架型号已核对。' },
    signOut: { done: false, at: '', note: '术后离室前完成。' },
    surgeon: '陈主任',
    anesthesiologist: '局部麻醉（桡动脉入路）',
    nurse: '李慧',
  },
];

export interface ChecklistListResult {
  items: SurgeryChecklist[];
  totalCount: number;
  demo: boolean;
}

export async function fetchSurgeryChecklists(): Promise<ChecklistListResult> {
  try {
    const res = await get<{ items: SurgeryChecklist[]; totalCount: number }>('/surgery/checklists');
    return { items: res.items, totalCount: res.totalCount, demo: false };
  } catch {
    return { items: DEMO_CHECKLISTS, totalCount: DEMO_CHECKLISTS.length, demo: true };
  }
}
