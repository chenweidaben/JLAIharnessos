/**
 * 健澜科技 jlmedaios - 门诊爽约率分析 V13 纯函数（M314-A）
 *
 * computeDeptNoShowRateV13 / computeDoctorNoShowRateV13 / identifyChronicNoShowPatientsV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 预约 */
export interface AppointmentV13 {
  appointmentId: string;
  dept: string;
  doctorId: string;
  patientId: string;
  isNoShow: boolean;
}

/**
 * 科室爽约率（纯函数）：noShow/total×100。
 *
 * @param appointments 预约列表
 * @param dept 科室
 * @returns 爽约率（百分比，0-100）
 */
export function computeDeptNoShowRateV13(appointments: AppointmentV13[], dept: string): number {
  const deptApps = appointments.filter((a) => a.dept === dept);
  if (deptApps.length === 0) return 0;
  const noShowCount = deptApps.filter((a) => a.isNoShow).length;
  return Math.round((noShowCount / deptApps.length) * 100);
}

/**
 * 医生爽约率（纯函数）：noShow/total×100。
 *
 * @param appointments 预约列表
 * @param doctorId 医生 ID
 * @returns 爽约率（百分比）
 */
export function computeDoctorNoShowRateV13(appointments: AppointmentV13[], doctorId: string): number {
  const docApps = appointments.filter((a) => a.doctorId === doctorId);
  if (docApps.length === 0) return 0;
  const noShowCount = docApps.filter((a) => a.isNoShow).length;
  return Math.round((noShowCount / docApps.length) * 100);
}

/**
 * 连续爽约标记（纯函数）：连续 noShow ≥ threshold 次 → 标记。
 *
 * @param visits 就诊记录（按患者时间顺序）
 * @param threshold 阈值
 * @returns 连续爽约患者 ID 列表
 */
export function identifyChronicNoShowPatientsV13(
  visits: { patientId: string; isNoShow: boolean }[],
  threshold: number,
): string[] {
  const byPatient = new Map<string, { streak: number; maxStreak: number }>();
  for (const v of visits) {
    const cur = byPatient.get(v.patientId) ?? { streak: 0, maxStreak: 0 };
    if (v.isNoShow) {
      cur.streak += 1;
      cur.maxStreak = Math.max(cur.maxStreak, cur.streak);
    } else {
      cur.streak = 0;
    }
    byPatient.set(v.patientId, cur);
  }
  return Array.from(byPatient.entries())
    .filter(([, v]) => v.maxStreak >= threshold)
    .map(([pid]) => pid);
}
