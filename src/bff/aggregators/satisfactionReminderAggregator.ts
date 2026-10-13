/**
 * 健澜科技 jlmedaios - 满意度提醒聚合器（M64-A）
 * 扫描出院后待填患者，按 stage 推 M20 通知中心；reminder_stage 幂等防重。越权 403。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { AuthView } from '../view/userView.js';
import { createNotification, listByPatient } from '../../db/repositories/patientNotificationRepo.js';
import { markReminder, scanDueReminders } from '../../db/repositories/satisfactionReminderRepo.js';
import { dueStage } from '../../medical-tools/nursing/satisfactionReminder.js';

export class ReminderError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    this.name = 'ReminderError';
  }
}
const forbidden = (m: string) => new ReminderError(403, 'FORBIDDEN', m);

function assertPermission(auth: AuthView, perm: string): void {
  if (!auth.permissions.includes(perm)) throw forbidden(`缺少权限：${perm}`);
}

/** days since created_at（出院后经过天数近似）。 */
function daysSince(createdAt: string): number {
  return Math.floor((Date.now() - new Date(createdAt).getTime()) / 86_400_000);
}

/** 管理员触发扫描，返回本轮推送数。 */
export async function scanView(auth: AuthView): Promise<{ pushed: number }> {
  assertPermission(auth, 'satisfaction:notify');
  const targets = await scanDueReminders();
  let pushed = 0;
  for (const t of targets) {
    const stage = dueStage(daysSince(t.createdAt), false);
    if (stage === 'none') continue;
    if (stage === 'first' && t.reminderStage === 'none') {
      await createNotification({
        patientId: t.patientId, notifType: 'report_pushed',
        title: '邀请您填写满意度评价', body: '出院后请对本次住院医疗服务进行评价。',
        refType: 'satisfaction', refId: t.surveyId,
      });
      await markReminder(t.surveyId, 'first_sent');
      pushed += 1;
    } else if (stage === 'second' && t.reminderStage === 'first_sent') {
      await createNotification({
        patientId: t.patientId, notifType: 'report_pushed',
        title: '满意度评价待您确认', body: '您尚未填写满意度评价，期待您的反馈。',
        refType: 'satisfaction', refId: t.surveyId,
      });
      await markReminder(t.surveyId, 'second_sent');
      pushed += 1;
    }
  }
  return { pushed };
}

/** 患者查自己待填问卷通知。 */
export async function myPendingView(auth: AuthView): Promise<{ items: Array<{ id: string; title: string; body: string; createdAt: string }> }> {
  assertPermission(auth, 'satisfaction:notify');
  const list = await listByPatient(auth.id);
  return {
    items: list
      .filter((n) => n.refType === 'satisfaction')
      .map((n) => ({ id: n.id, title: n.title, body: n.body, createdAt: n.createdAt })),
  };
}
