/**
 * 急诊预检分诊五级纯函数（M35-A）。
 */

export type TriageLevel = 'I' | 'II' | 'III' | 'IV' | 'V';

export interface Vitals {
  systolicBp?: number | null;
  heartRate?: number | null;
  respRate?: number | null;
  spo2?: number | null;
  gcs?: number | null;
  chiefComplaint?: string | null;
}

export function triageLevel(v: Vitals): TriageLevel {
  if ((v.systolicBp != null && v.systolicBp < 90) ||
      (v.spo2 != null && v.spo2 < 90) ||
      (v.gcs != null && v.gcs < 9)) return 'I';
  if ((v.heartRate != null && v.heartRate > 120) ||
      (v.respRate != null && v.respRate > 30)) return 'II';
  const cc = (v.chiefComplaint ?? '').toLowerCase();
  if (cc.includes('chest pain') || cc.includes('stroke') || cc.includes('trauma')) return 'II';
  if (cc.includes('fever') || cc.includes('wound') || cc.includes('abdominal')) return 'III';
  if (cc.includes('followup') || cc.includes('prescription')) return 'V';
  return 'IV';
}

export function needsGreenChannel(level: TriageLevel): boolean {
  return level === 'I' || level === 'II';
}
