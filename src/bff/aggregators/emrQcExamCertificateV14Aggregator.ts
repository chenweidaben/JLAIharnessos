/**
 * 健澜科技 jlmedaios - 质控考核证书 V14 聚合器（M503-C）
 *
 * 纯函数：考核证书构建 + 证书验证。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 考核证书 */
export interface ExamCertificateV14 {
  user: string;
  examName: string;
  score: number;
}

/** 证书验证结果 */
export interface CertificateVerifyV14 {
  valid: boolean;
  level: string;
}

/**
 * 构建考核证书。
 *
 * @param user 用户名
 * @param examName 考试名
 * @param score 成绩
 * @returns 考核证书
 */
export function buildCertificate(user: string, examName: string, score: number): ExamCertificateV14 {
  return { user, examName, score };
}

/**
 * 验证证书有效性。
 *
 * @param cert 考核证书
 * @returns 验证结果（valid + level）
 */
export function verifyCertificate(cert: ExamCertificateV14): CertificateVerifyV14 {
  // 手算证书验证：score >= 60 有效；>=90优秀 / 80-89良好 / 60-79及格 / <60无效（不及格）
  if (cert.score >= 90) {
    return { valid: true, level: "优秀" };
  }
  if (cert.score >= 80) {
    return { valid: true, level: "良好" };
  }
  if (cert.score >= 60) {
    return { valid: true, level: "及格" };
  }
  return { valid: false, level: "不及格" };
}
