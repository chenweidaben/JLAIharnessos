/**
 * 健澜科技 jlmedaios - 相似医生协同推荐 V13 纯函数（M303-B）
 *
 * computeDoctorSimilarityV13 / findLookAlikeDoctorsV13 / borrowPreferenceV13
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 医生偏好向量 */
export interface DoctorVectorV13 {
  doctorId: string;
  vector: number[];
}

/**
 * 余弦相似度（纯函数）：保留2位。
 *
 * @param a 医生A向量
 * @param b 医生B向量
 * @returns 相似度 [-1, 1]
 */
export function computeDoctorSimilarityV13(a: DoctorVectorV13, b: DoctorVectorV13): number {
  const n = Math.min(a.vector.length, b.vector.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    dot += a.vector[i] * b.vector[i];
    na += a.vector[i] * a.vector[i];
    nb += b.vector[i] * b.vector[i];
  }
  if (na === 0 || nb === 0) return 0;
  return Math.round((dot / (Math.sqrt(na) * Math.sqrt(nb))) * 100) / 100;
}

/**
 * 找相似医生 TopN（纯函数）：按相似度降序，去掉自己。
 *
 * @param targetDoctor 目标医生
 * @param allDoctors 所有医生
 * @param topN 数量
 * @returns 相似列表
 */
export function findLookAlikeDoctorsV13(
  targetDoctor: DoctorVectorV13,
  allDoctors: DoctorVectorV13[],
  topN: number,
): { doctorId: string; similarity: number }[] {
  return allDoctors
    .filter((d) => d.doctorId !== targetDoctor.doctorId)
    .map((d) => ({
      doctorId: d.doctorId,
      similarity: computeDoctorSimilarityV13(targetDoctor, d),
    }))
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN);
}

/**
 * 借偏好冷启动（纯函数）：相似医生向量取均值。
 *
 * @param targetDoctor 目标医生
 * @param lookAlikes 相似医生列表（含原始向量）
 * @returns 冷启动向量
 */
export function borrowPreferenceV13(
  targetDoctor: DoctorVectorV13,
  lookAlikes: DoctorVectorV13[],
): number[] {
  void targetDoctor;
  if (lookAlikes.length === 0) return [];
  const dim = lookAlikes[0].vector.length;
  const acc = new Array<number>(dim).fill(0);
  for (const d of lookAlikes) {
    for (let i = 0; i < dim; i++) acc[i] += d.vector[i] ?? 0;
  }
  return acc.map((v) => Math.round((v / lookAlikes.length) * 100) / 100);
}
