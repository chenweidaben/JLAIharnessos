/**
 * 健澜科技 jlmedaios - 体检预约管理 API（M722）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type PhysicalStatus = 'booked' | 'checked_in' | 'completed' | 'reported';

export interface PhysicalExam {
  id: string;
  apptNo: string;
  examinee: string;
  packageName: string;
  scheduledAt: string;
  status: PhysicalStatus;
  items: string[];
  notes: string;
  centerInfo: string;
}

export const PHYSICAL_STATUS_META: Record<PhysicalStatus, { label: string; color: string }> = {
  booked: { label: '已预约', color: 'blue' },
  checked_in: { label: '已签到', color: 'processing' },
  completed: { label: '已完成检查', color: 'orange' },
  reported: { label: '已出报告', color: 'green' },
};

const DEMO: PhysicalExam[] = [
  {
    id: 'PE-001',
    apptNo: 'PE-26102501',
    examinee: '张某某',
    packageName: 'VIP 精英体检套餐',
    scheduledAt: '2026-10-25T08:00:00+08:00',
    status: 'booked',
    items: ['一般检查', '血常规', '生化全套', '心电图', '胸部 CT', '腹部 B 超', '无痛胃肠镜'],
    notes: '体检前一日晚 10 点后禁食；女性避开月经期；带身份证。',
    centerInfo: '健康管理中心 3F，VIP 通道；联系电话 0571-XXXXXXXX。',
  },
];

export interface PhysicalListResult {
  items: PhysicalExam[];
  demo: boolean;
}

export async function fetchPhysicalExams(): Promise<PhysicalListResult> {
  try {
    const res = await get<{ items: PhysicalExam[] }>('/patient-service/physical-exams');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
