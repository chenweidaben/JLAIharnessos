/**
 * 健澜科技 jlmedaios - 抗菌药物分级管理 API（M716）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type AmsGrade = 'non_restricted' | 'restricted' | 'special';

export interface AmsGradeItem {
  id: string;
  drugName: string;
  grade: AmsGrade;
  allowedDepts: string;
  approvalAuthority: string;
  basis: string;
  restriction: string;
  approvalProcess: string;
}

export const AMS_GRADE_META: Record<AmsGrade, { label: string; color: string }> = {
  non_restricted: { label: '非限制使用级', color: 'green' },
  restricted: { label: '限制使用级', color: 'blue' },
  special: { label: '特殊使用级', color: 'red' },
};

const DEMO: AmsGradeItem[] = [
  {
    id: 'AG-001',
    drugName: '头孢呋辛',
    grade: 'non_restricted',
    allowedDepts: '全院',
    approvalAuthority: '住院医师及以上',
    basis: '疗效确切、不良反应小、价格低廉。',
    restriction: '无特殊限制。',
    approvalProcess: '医师直接开具。',
  },
  {
    id: 'AG-002',
    drugName: '美罗培南',
    grade: 'special',
    allowedDepts: 'ICU / 感染科 / 呼吸科',
    approvalAuthority: '副主任医师及以上 + 感染科会诊',
    basis: '特殊使用级碳青霉烯类，耐多药菌感染备选。',
    restriction: '门诊不得使用；急诊仅限危重感染经验性治疗 48h。',
    approvalProcess: '专科副主任医师申请 → 感染科会诊 → 抗菌药物管理小组审批。',
  },
];

export interface AmsListResult {
  items: AmsGradeItem[];
  demo: boolean;
}

export async function fetchAmsGrades(): Promise<AmsListResult> {
  try {
    const res = await get<{ items: AmsGradeItem[] }>('/pharmacy/ams-grades');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
