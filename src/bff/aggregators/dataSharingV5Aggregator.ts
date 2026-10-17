/**
 * 健澜科技 jlmedaios - 院间数据共享授权 V5 纯函数（M281-C）
 *
 * grantConsentV5 / checkConsentV5 / revokeConsentV5 / buildDataSharingV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 共享授权 */
export interface SharingConsent {
  id: string;
  patientRef: string;
  requesterOrg: string;
  reason: string;
  resourcesScope: string[];
  granted: boolean;
  expiresAt: string;
  revokedAt: string | null;
}

/** 共享审计 */
export interface SharingAudit {
  consentId: string;
  accessedBy: string;
  resource: string;
}

/**
 * 授予授权 V5（纯函数）。
 *
 * @param patient 患者引用
 * @param req 请求机构与原因
 * @param scope 资源范围
 * @param days 有效天数
 * @returns 授权记录
 */
export function grantConsentV5(
  patient: string,
  req: { requesterOrg: string; reason: string },
  scope: string[],
  days: number,
): SharingConsent {
  const expires = new Date(Date.now() + days * 24 * 3600 * 1000).toISOString();
  return {
    id: `consent-${Date.now()}`,
    patientRef: patient,
    requesterOrg: req.requesterOrg,
    reason: req.reason,
    resourcesScope: scope,
    granted: true,
    expiresAt: expires,
    revokedAt: null,
  };
}

/**
 * 鉴权 V5（纯函数）：授权未撤回、未过期、且资源在范围内。
 *
 * @param consent 授权
 * @param resource 申请资源
 * @returns 是否允许
 */
export function checkConsentV5(consent: SharingConsent, resource: string): boolean {
  if (!consent.granted) return false;
  if (consent.revokedAt) return false;
  if (new Date(consent.expiresAt).getTime() < Date.now()) return false;
  return consent.resourcesScope.includes(resource);
}

/**
 * 撤回授权 V5（纯函数）。
 *
 * @param consent 授权
 * @returns 撤回后授权
 */
export function revokeConsentV5(consent: SharingConsent): SharingConsent {
  return { ...consent, granted: false, revokedAt: new Date().toISOString() };
}

/** 共享看板输出 */
export interface DataSharingV5Report {
  totalConsents: number;
  activeCount: number;
  revokedCount: number;
  auditCount: number;
}

/**
 * 构建共享看板（纯函数）。
 *
 * @param consents 授权列表
 * @param audits 审计列表
 * @returns 看板
 */
export function buildDataSharingV5Report(consents: SharingConsent[], audits: SharingAudit[]): DataSharingV5Report {
  const activeCount = consents.filter((c) => c.granted && !c.revokedAt).length;
  const revokedCount = consents.filter((c) => c.revokedAt !== null).length;
  return {
    totalConsents: consents.length,
    activeCount,
    revokedCount,
    auditCount: audits.length,
  };
}
