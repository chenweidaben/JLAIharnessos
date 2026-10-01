/**
 * 健澜科技 jlmedaios - 互联网医院类型（M3-J）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 患者账号 */
export interface PatientAccount {
  id: string;
  openid: string | null;
  unionid: string | null;
  channel: string;
  status: 'active' | 'disabled' | 'logged_out';
  lastLoginAt: string | null;
  createdAt: string;
}

/** 就诊人（脱敏视图） */
export interface PatientProfileView {
  id: string;
  relation: 'self' | 'parent' | 'child' | 'spouse' | 'other';
  nameMasked: string | null;
  gender: string | null;
  authLevel: number;
  isDefault: boolean;
  patientId: string | null;
  delegatedScopes: string[];
}

/** 实名认证结果 */
export interface RealnameResultView {
  passed: boolean;
  provider: string;
  isDemo: boolean;
  patientId: string | null;
  authLevel: number;
}

/** 医护线上资质 */
export interface InternetPractitionerView {
  id: string;
  userId: string;
  practitionerNo: string | null;
  practitionerType: 'doctor' | 'pharmacist' | 'nurse';
  practiceScope: string | null;
  practiceYears: number | null;
  auditStatus: 'pending' | 'approved' | 'rejected';
  auditReason: string | null;
  approvedAt: string | null;
  approvedBy: string | null;
  validFrom: string | null;
  validTo: string | null;
  createdAt: string;
}

/** 患者登录结果 */
export interface PatientLoginView {
  token: string;
  accountId: string;
  openid: string | null;
  isDemoLogin: boolean;
  profileCount: number;
}
