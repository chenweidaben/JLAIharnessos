/**
 * 健澜科技 jlmedaios - 手术分级授权管理 API（M712）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type SurgeryGrade = 'grade1' | 'grade2' | 'grade3' | 'grade4';

export interface SurgeryGrading {
  id: string;
  physician: string;
  dept: string;
  grade: SurgeryGrade;
  authorizedSurgeries: string[];
  validUntil: string;
  assessments: { date: string; result: string }[];
  changes: { date: string; change: string }[];
}

export const SURGERY_GRADE_META: Record<SurgeryGrade, { label: string; color: string }> = {
  grade1: { label: '一级手术', color: 'green' },
  grade2: { label: '二级手术', color: 'blue' },
  grade3: { label: '三级手术', color: 'orange' },
  grade4: { label: '四级手术', color: 'red' },
};

const DEMO: SurgeryGrading[] = [
  {
    id: 'SG-001',
    physician: '陈医师',
    dept: '普外科',
    grade: 'grade3',
    authorizedSurgeries: ['腹腔镜胆囊切除', '阑尾切除', '疝修补术'],
    validUntil: '2027-12-31',
    assessments: [
      { date: '2026-06-30', result: '年度考核合格' },
      { date: '2025-06-30', result: '年度考核合格' },
    ],
    changes: [
      { date: '2026-01-01', change: '由二级升为三级（含腹腔镜胆囊切除）' },
    ],
  },
  {
    id: 'SG-002',
    physician: '王医师',
    dept: '骨科',
    grade: 'grade4',
    authorizedSurgeries: ['全髋关节置换', '脊柱内固定', '复杂骨折切开复位'],
    validUntil: '2026-12-31',
    assessments: [
      { date: '2026-06-30', result: '年度考核优秀' },
    ],
    changes: [],
  },
];

export interface GradingListResult {
  items: SurgeryGrading[];
  demo: boolean;
}

export async function fetchSurgeryGradings(): Promise<GradingListResult> {
  try {
    const res = await get<{ items: SurgeryGrading[] }>('/surgery/gradings');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
