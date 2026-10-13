/**
 * 健澜科技 jlmedaios - 手术核查表展示工具（M82-A）
 * Copyright (c) 杭州健澜科技有限公司
 */
import type { SurgicalChecklist } from '@/types/surgicalChecklist';

export const STATUS_COLOR: Record<SurgicalChecklist['status'], string> = {
  in_progress: 'blue',
  passed: 'green',
  failed: 'red',
};

export function missingOf(c: SurgicalChecklist): string[] {
  const m: string[] = [];
  if (!c.patientConfirmed) m.push('patient');
  if (!c.siteMarked) m.push('site');
  if (!c.procedureConfirmed) m.push('procedure');
  if (!c.allergyConfirmed) m.push('allergy');
  if (!c.antibioticGiven) m.push('antibiotic');
  if (!c.bloodPrepared) m.push('blood');
  if (!c.instrumentsCounted) m.push('instruments');
  return m;
}
