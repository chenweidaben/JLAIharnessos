/**
 * 产后异常工单纯函数（M34-B）。
 */

import { jaundiceElevated, breastfeedingAdequacy } from './postpartumVisit.js';

export function needsReferral(day: number, tcb: number | null, breastfeedingScore: number): boolean {
  return jaundiceElevated(day, tcb) || !breastfeedingAdequacy(breastfeedingScore);
}

export function postpartumTaskTitle(day: number, tcb: number | null, breastfeedingScore: number): string {
  if (jaundiceElevated(day, tcb)) return `新生儿黄疸 Day${day} TcB=${tcb}`;
  return `母乳喂养不足 score=${breastfeedingScore}`;
}

export function postpartumTaskFinding(day: number, tcb: number | null, breastfeedingScore: number): string {
  return `postpartum day=${day} tcb=${tcb ?? 'n/a'} breastfeeding=${breastfeedingScore}`;
}
