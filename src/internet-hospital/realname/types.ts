/**
 * 健澜科技 jlmedaios - 互联网医院实名认证提供方契约（M3-J）
 *
 * 实名认证是互联网医院合规的第一道闸：
 *  - 患者须提供真实身份信息，禁止假冒；
 *  - 在线复诊、开处方、医保支付须强实名（L2 及以上）；
 *  - 提供方可插拔：本地演示（明确标注）/ 第三方持证厂商。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 实名认证请求（敏感信息最小化，传输加密，不留存原始生物特征） */
export interface RealnameRequest {
  /** 真实姓名 */
  realName: string;
  /** 身份证号（18 位） */
  idCard: string;
  /** 人脸活体图像（Base64，可选；强实名人脸比对时使用） */
  faceImageBase64?: string;
  /** 手机号（运营商三要素时使用） */
  phone?: string;
}

/** 实名认证结果 */
export interface RealnameResult {
  /** 是否通过 */
  passed: boolean;
  /** 提供方名称（如 local-demo / tencent / aliyun） */
  provider: string;
  /** 失败原因 */
  reason?: string;
  /** 人脸比对分数（0-100，仅人脸核验时返回） */
  score?: number;
  /** 是否本地演示（明确标注，禁止冒充真实认证） */
  isDemo: boolean;
}

/** 实名认证提供方接口 */
export interface RealnameProvider {
  /** 提供方唯一名称 */
  readonly name: string;
  /** 是否为本地演示提供方 */
  readonly isDemo: boolean;
  /** 执行实名认证 */
  verify(request: RealnameRequest): Promise<RealnameResult>;
}

/** 认证等级（与 patient_profiles.auth_level 对应） */
export const AUTH_LEVEL = {
  /** L1：微信授权（手机号） */
  WECHAT: 1,
  /** L2：身份证 + 人脸活体（强实名） */
  STRONG: 2,
  /** L3：医保电子凭证 / 电子健康卡 */
  CERT: 3,
} as const;
