/**
 * 健澜科技 jlmedaios - 病理科工作流程 API（M690）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SpecimenStage = 'received' | 'grossed' | 'sectioned' | 'stained' | 'reported';

export interface PathologySpecimen {
  id: string;
  specimenNo: string;
  patientId: string;
  bodyPart: string;
  stage: SpecimenStage;
  receivedAt: string;
  grossedBy: string;
  sectionedBy: string;
  reportedAt: string | null;
}

export const SPECIMEN_STAGE_META: Record<SpecimenStage, { label: string; color: string }> = {
  received: { label: '已接收', color: 'default' },
  grossed: { label: '已取材', color: 'blue' },
  sectioned: { label: '已切片', color: 'cyan' },
  stained: { label: '已染色', color: 'orange' },
  reported: { label: '已发报告', color: 'green' },
};

const DEMO: PathologySpecimen[] = [
  {
    id: 'SP-001',
    specimenNo: 'PTH-2610001',
    patientId: 'P10011',
    bodyPart: '结肠',
    stage: 'reported',
    receivedAt: '2026-10-21T10:00:00+08:00',
    grossedBy: '陈技师',
    sectionedBy: '林技师',
    reportedAt: '2026-10-22T11:00:00+08:00',
  },
  {
    id: 'SP-002',
    specimenNo: 'PTH-2610002',
    patientId: 'P10015',
    bodyPart: '胃镜活检',
    stage: 'sectioned',
    receivedAt: '2026-10-22T09:00:00+08:00',
    grossedBy: '陈技师',
    sectionedBy: '林技师',
    reportedAt: null,
  },
  {
    id: 'SP-003',
    specimenNo: 'PTH-2610003',
    patientId: 'P10018',
    bodyPart: '甲状腺',
    stage: 'received',
    receivedAt: '2026-10-22T11:30:00+08:00',
    grossedBy: '—',
    sectionedBy: '—',
    reportedAt: null,
  },
];

export interface SpecimenListResult {
  items: PathologySpecimen[];
  demo: boolean;
}

export async function fetchPathologySpecimens(): Promise<SpecimenListResult> {
  try {
    const res = await get<{ items: PathologySpecimen[] }>('/pathology/specimens');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
