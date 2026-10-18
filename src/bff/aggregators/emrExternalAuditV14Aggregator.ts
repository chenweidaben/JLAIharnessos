/**
 * 健澜科技 jlmedaios - 病历外审申请 V14 聚合器（M540-D）
 *
 * 纯函数：构建外审申请基础数据 + 外审申请 + 构建外审报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 外审申请基础数据 */
export interface ExternalAuditV14 {
  recordId: string;
  applicant: string;
}

/** 外审申请输入 */
export interface ExternalAuditInputV14 {
  recordId: string;
  auditOrg: string;
  purpose: string;
}

/** 外审申请结果 */
export interface ExternalAuditResultV14 {
  applied: boolean;
  auditNo: string;
}

/** 外审报告 */
export interface ExternalAuditReportV14 {
  applied: boolean;
  auditNo: string;
}

/**
 * 构建外审申请基础数据。
 *
 * @param recordId 病历ID
 * @param applicant 申请人
 * @returns 外审申请基础数据
 */
export function buildExternalAudit(recordId: string, applicant: string): ExternalAuditV14 {
  return { recordId, applicant };
}

/**
 * 外审申请。
 * applied = true
 * auditNo = 'EA' + Date.now().toString().slice(-6)
 *
 * @param input 申请输入（病历ID + 审核机构 + 申请用途）
 * @returns 申请结果（applied + auditNo）
 */
export function applyExternalAudit(input: ExternalAuditInputV14): ExternalAuditResultV14 {
  // 手算：applied = true
  // 测试2：recordId='REC704', auditOrg='卫健委' → applied=true
  // 测试3：recordId='REC705', auditOrg='医保局' → applied=true
  const applied = true;
  // 手算：auditNo = 'EA' + Date.now().toString().slice(-6)
  // 测试2：recordId='REC704' → auditNo 以 'EA' 开头
  // 测试3：recordId='REC705' → auditNo 以 'EA' 开头
  const auditNo = "EA" + Date.now().toString().slice(-6);
  return { applied, auditNo };
}

/**
 * 构建外审报告。
 *
 * @param result 申请结果
 * @returns 外审报告（applied + auditNo 透传）
 */
export function buildExternalAuditReport(result: ExternalAuditResultV14): ExternalAuditReportV14 {
  // 手算：透传 applied + auditNo
  // 测试4：{applied=true, auditNo='EA123456'} → applied=true, auditNo='EA123456'
  return { applied: result.applied, auditNo: result.auditNo };
}
