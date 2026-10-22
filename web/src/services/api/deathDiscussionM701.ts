/**
 * 健澜科技 jlmedaios - 死亡病例讨论 API（M701）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DeathDiscussion {
  id: string;
  inpatientNo: string;
  patientId: string;
  deathDate: string;
  discussedAt: string;
  chair: string;
  causeAnalysis: string;
  lessons: string;
  improvements: string[];
}

const DEMO: DeathDiscussion[] = [
  {
    id: 'DD-001',
    inpatientNo: 'ZY-2580',
    patientId: 'P10030',
    deathDate: '2026-10-15',
    discussedAt: '2026-10-20T15:00:00+08:00',
    chair: '医务处孙主任',
    causeAnalysis: '重症肺炎合并感染性休克，多脏器功能衰竭死亡。',
    lessons: '早期抗感染强度不足，血管活性药启动偏晚。',
    improvements: ['重症感染抗菌药物 1h 内启动', 'qSOFA 阳性患者即升级监护', '感染性休克集束化治疗流程再培训'],
  },
];

export interface DiscussionListResult {
  items: DeathDiscussion[];
  demo: boolean;
}

export async function fetchDeathDiscussions(): Promise<DiscussionListResult> {
  try {
    const res = await get<{ items: DeathDiscussion[] }>('/medical-records/death-discussions');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
