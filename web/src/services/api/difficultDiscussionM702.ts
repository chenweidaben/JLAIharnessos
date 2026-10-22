/**
 * 健澜科技 jlmedaios - 疑难病例讨论 API（M702）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DifficultDiscussion {
  id: string;
  inpatientNo: string;
  patientId: string;
  topic: string;
  discussedAt: string;
  chairDept: string;
  caseSummary: string;
  opinions: string[];
  planAdjustment: string;
}

const DEMO: DifficultDiscussion[] = [
  {
    id: 'DF-001',
    inpatientNo: 'ZY-2605',
    patientId: 'P10005',
    topic: '反复发热 1 月余待查（FUO）',
    discussedAt: '2026-10-21T14:00:00+08:00',
    chairDept: '呼吸科',
    caseSummary: '老年男性，反复发热 38.5-39.5℃ 1 月，多种抗感染方案无效；CT 见纵隔淋巴结肿大。',
    opinions: [
      '血液科：建议 PET-CT + 淋巴结活检，排除淋巴瘤。',
      '感染科：感染证据不足，建议停用广谱抗生素，行 T-SPOT、G/GM 试验。',
      '风湿科：自身抗体谱筛查，排除成人 Still 病。',
    ],
    planAdjustment: '停广谱抗生素；完善 PET-CT + 纵隔 EBUS-TBNA 活检 + 自身抗体谱。',
  },
];

export interface DiscussionListResult {
  items: DifficultDiscussion[];
  demo: boolean;
}

export async function fetchDifficultDiscussions(): Promise<DiscussionListResult> {
  try {
    const res = await get<{ items: DifficultDiscussion[] }>('/medical-records/difficult-discussions');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
