/**
 * 化疗 T-1 提醒纯函数（M43-A）。
 */

export function isEligibleForReminder(plannedDate: string, today: Date, alreadyNotified: boolean): boolean {
  if (alreadyNotified) return false;
  const tomorrow = new Date(today.getTime() + 86400000);
  const y = tomorrow.getFullYear();
  const m = String(tomorrow.getMonth() + 1).padStart(2, '0');
  const d = String(tomorrow.getDate()).padStart(2, '0');
  return plannedDate === `${y}-${m}-${d}`;
}

export function buildMessage(drug: string, cycleNo: number): { title: string; body: string } {
  return {
    title: '化疗复诊提醒',
    body: `您预约的 ${drug} 第 ${cycleNo} 周期化疗将于明日进行，请按时到院。`,
  };
}
