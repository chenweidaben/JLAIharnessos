/**
 * 健澜科技 jlmedaios - 病历访问审计日志 V14 聚合器（M528-A）
 *
 * 纯函数：构建访问审计基础数据 + 访问日志记录 + 构建审计报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 访问审计基础数据 */
export interface AccessAuditV14 {
  recordId: string;
  operator: string;
}

/** 访问日志输入 */
export interface AccessAuditInputV14 {
  recordId: string;
  operator: string;
  action: "查看" | "修改" | "导出";
  isSensitive: boolean;
}

/** 访问日志结果 */
export interface AccessAuditResultV14 {
  logged: boolean;
  riskLevel: string;
}

/** 审计报告 */
export interface AccessAuditReportV14 {
  logged: boolean;
  riskLevel: string;
}

/**
 * 构建访问审计基础数据。
 *
 * @param recordId 病历ID
 * @param operator 操作人
 * @returns 访问审计基础数据
 */
export function buildAccessAudit(recordId: string, operator: string): AccessAuditV14 {
  return { recordId, operator };
}

/**
 * 访问日志记录。
 * logged = true；isSensitive=true→riskLevel='高风险'，否则 action='导出'→riskLevel='中风险'，否则→riskLevel='低风险'。
 *
 * @param input 访问日志输入（病历ID + 操作人 + 操作类型 + 是否敏感）
 * @returns 日志结果（logged + riskLevel）
 */
export function logAccessEvent(input: AccessAuditInputV14): AccessAuditResultV14 {
  // 手算：logged = true（任何访问都记录）
  // 测试2/3：logged=true
  const logged = true;
  // 手算：isSensitive=true→'高风险'，否则 action='导出'→'中风险'，否则→'低风险'
  // 测试2：isSensitive=true → riskLevel='高风险'
  // 测试3：isSensitive=false, action='导出' → riskLevel='中风险'
  let riskLevel: string;
  if (input.isSensitive) {
    riskLevel = "高风险";
  } else if (input.action === "导出") {
    riskLevel = "中风险";
  } else {
    riskLevel = "低风险";
  }
  return { logged, riskLevel };
}

/**
 * 构建审计报告。
 *
 * @param result 日志结果
 * @returns 审计报告（logged + riskLevel 透传）
 */
export function buildAccessAuditReport(result: AccessAuditResultV14): AccessAuditReportV14 {
  // 手算：透传 logged + riskLevel
  // 测试4：{logged:true, riskLevel:'高风险'} → logged=true, riskLevel='高风险'
  return { logged: result.logged, riskLevel: result.riskLevel };
}
