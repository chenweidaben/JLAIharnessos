/**
 * 健澜科技 jlmedaios - 推送个人化学习 V13 纯函数（M303-A）
 *
 * buildDoctorPreferenceV13 / personalizeRankV13 / forgetStalePreferenceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生行为事件 */
export interface DoctorEventV13 {
  dept: string;
  disease: string;
  evidenceLevel: string;
  author: string;
  action: "clicked" | "adopted" | "dismissed";
}

/** 偏好向量 */
export interface DoctorPreferenceV13 {
  deptPref: Record<string, number>;
  diseasePref: Record<string, number>;
  evidencePref: Record<string, number>;
  authorPref: Record<string, number>;
}

/** 经验向量 */
export interface ExperienceVectorV13 {
  dept: string;
  disease: string;
  evidenceLevel: string;
  author: string;
}

const ACTION_SCORE: Record<DoctorEventV13["action"], number> = {
  clicked: 1,
  adopted: 3,
  dismissed: -2,
};

/**
 * 累加偏好分（纯函数）：点击+1/采纳+3/划走-2。
 *
 * @param events 行为事件列表
 * @returns 偏好向量
 */
export function buildDoctorPreferenceV13(events: DoctorEventV13[]): DoctorPreferenceV13 {
  const pref: DoctorPreferenceV13 = {
    deptPref: {},
    diseasePref: {},
    evidencePref: {},
    authorPref: {},
  };
  for (const e of events) {
    const s = ACTION_SCORE[e.action];
    pref.deptPref[e.dept] = (pref.deptPref[e.dept] ?? 0) + s;
    pref.diseasePref[e.disease] = (pref.diseasePref[e.disease] ?? 0) + s;
    pref.evidencePref[e.evidenceLevel] = (pref.evidencePref[e.evidenceLevel] ?? 0) + s;
    pref.authorPref[e.author] = (pref.authorPref[e.author] ?? 0) + s;
  }
  return pref;
}

/**
 * 个人化排序（纯函数）：baseScore × (1 + 偏好匹配度/10)，保留2位。
 *
 * @param baseScore M302 基础分
 * @param pref 偏好向量
 * @param expVector 经验向量
 * @returns 个人化分数
 */
export function personalizeRankV13(
  baseScore: number,
  pref: DoctorPreferenceV13,
  expVector: ExperienceVectorV13,
): number {
  const match =
    (pref.deptPref[expVector.dept] ?? 0) +
    (pref.diseasePref[expVector.disease] ?? 0) +
    (pref.evidencePref[expVector.evidenceLevel] ?? 0) +
    (pref.authorPref[expVector.author] ?? 0);
  return Math.round(baseScore * (1 + match / 10) * 100) / 100;
}

/**
 * 旧偏好衰减（纯函数）：lastDays>90 → 所有偏好分×0.5。
 *
 * @param pref 偏好向量
 * @param lastDays 距最近一次行为天数
 * @returns 衰减后向量
 */
export function forgetStalePreferenceV13(pref: DoctorPreferenceV13, lastDays: number): DoctorPreferenceV13 {
  if (lastDays <= 90) return pref;
  const scale = (rec: Record<string, number>): Record<string, number> =>
    Object.fromEntries(Object.entries(rec).map(([k, v]) => [k, v * 0.5]));
  return {
    deptPref: scale(pref.deptPref),
    diseasePref: scale(pref.diseasePref),
    evidencePref: scale(pref.evidencePref),
    authorPref: scale(pref.authorPref),
  };
}
