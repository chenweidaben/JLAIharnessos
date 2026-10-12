/**
 * 健澜科技 jlmedaios - 患者通知文案纯函数（M20-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type NotifType = 'report_pushed' | 'appointment_booked' | 'appointment_cancelled' | 'critical';

export interface NotifInput {
  reportType?: 'lab' | 'imaging';
  appointmentNo?: string;
  slotStart?: string;
}

export function buildNotif(type: NotifType, input: NotifInput): { title: string; body: string } {
  switch (type) {
    case 'report_pushed':
      return { title: '您有新报告已推送', body: `${input.reportType === 'imaging' ? '影像' : '检验'}报告已审核完成，请及时查看` };
    case 'appointment_booked':
      return { title: '预约成功', body: `预约号 ${input.appointmentNo ?? ''} ${input.slotStart ?? ''}` };
    case 'appointment_cancelled':
      return { title: '预约已取消', body: `预约号 ${input.appointmentNo ?? ''} 已取消` };
    case 'critical':
      return { title: '重要通知', body: '请及时关注' };
  }
}

export interface NotifRow { readAt: string | null }
export function unreadOnly<T extends NotifRow>(rows: T[]): T[] {
  return rows.filter((r) => r.readAt == null);
}
