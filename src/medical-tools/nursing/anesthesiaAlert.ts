/**
 * 麻醉告警工单纯函数（M31-D）。
 */

export function preopMissingItems(npo: boolean, allergy: boolean, consent: boolean): string[] {
  const m: string[] = [];
  if (!npo) m.push('npo');
  if (!allergy) m.push('allergy');
  if (!consent) m.push('consent');
  return m;
}

export function shouldCreatePreopTask(npo: boolean, allergy: boolean, consent: boolean): boolean {
  return preopMissingItems(npo, allergy, consent).length > 0;
}

export function preopTaskTitle(miss: string[]): string {
  return `术前三项缺失: ${miss.join(',')}`;
}

export function shouldCreatePacuTask(delayedRecovery: boolean): boolean {
  return delayedRecovery;
}

export function pacuTaskTitle(): string {
  return 'PACU 苏醒延迟';
}
