/**
 * 健澜科技 jlmedaios - 会议管理 API（M748）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type MeetingStatus = 'planned' | 'ongoing' | 'completed' | 'cancelled';

export interface Meeting {
  id: string;
  topic: string;
  heldAt: string;
  room: string;
  participantCount: number;
  status: MeetingStatus;
  agenda: string;
  attendees: string[];
  minutes: string;
}

export const MEETING_STATUS_META: Record<MeetingStatus, { label: string; color: string }> = {
  planned: { label: '已计划', color: 'blue' },
  ongoing: { label: '进行中', color: 'processing' },
  completed: { label: '已结束', color: 'green' },
  cancelled: { label: '已取消', color: 'red' },
};

const DEMO: Meeting[] = [
  {
    id: 'MT-001',
    topic: '2026 年第四季度医疗质量安全会议',
    heldAt: '2026-10-25T14:00:00+08:00',
    room: '行政楼 3F 第一会议室',
    participantCount: 32,
    status: 'planned',
    agenda: '1) Q3 质控通报；2) 核心制度落实；3) 下一阶段重点。',
    attendees: ['陈副院长', '医务处', '护理部', '各临床科室主任'],
    minutes: '待会议结束后发布。',
  },
];

export interface MeetingListResult {
  items: Meeting[];
  demo: boolean;
}

export async function fetchMeetings(): Promise<MeetingListResult> {
  try {
    const res = await get<{ items: Meeting[] }>('/admin/meetings');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
