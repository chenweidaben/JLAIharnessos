/**
 * 健澜科技 jlmedaios - 病历销毁登记（避让版）V14 聚合器（M541-B）
 *
 * 纯函数：构建销毁登记基础数据 + 销毁登记 + 构建销毁报告。
 * 避让说明：基础名 emrDestroyRecordV14 已被 M482-D（病历销毁记录）占用，本片采用 -apply 后缀避让（emrDestroyApplyV14）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 销毁登记基础数据 */
export interface DestroyApplyV14 {
  recordId: string;
  destroyDate: string;
}

/** 销毁登记输入 */
export interface DestroyApplyInputV14 {
  recordId: string;
  approver: string;
  reason: string;
}

/** 销毁登记结果 */
export interface DestroyApplyResultV14 {
  registered: boolean;
  destroyNo: string;
}

/** 销毁报告 */
export interface DestroyApplyReportV14 {
  registered: boolean;
  destroyNo: string;
}

/**
 * 构建销毁登记基础数据。
 *
 * @param recordId 病历ID
 * @param destroyDate 销毁日期
 * @returns 销毁登记基础数据
 */
export function buildDestroyApply(recordId: string, destroyDate: string): DestroyApplyV14 {
  return { recordId, destroyDate };
}

/**
 * 销毁登记。
 * registered = true
 * destroyNo = 'DES' + Date.now().toString().slice(-6)
 *
 * @param input 登记输入（病历ID + 审批人 + 销毁原因）
 * @returns 登记结果（registered + destroyNo）
 */
export function registerDestroyApply(input: DestroyApplyInputV14): DestroyApplyResultV14 {
  // 手算：registered = true
  // 测试2：recordId='REC802', approver='医务处长' → registered=true
  // 测试3：recordId='REC803', approver='质控科长' → registered=true
  const registered = true;
  // 手算：destroyNo = 'DES' + Date.now().toString().slice(-6)
  // 测试2：recordId='REC802' → destroyNo 以 'DES' 开头
  // 测试3：recordId='REC803' → destroyNo 以 'DES' 开头
  const destroyNo = "DES" + Date.now().toString().slice(-6);
  return { registered, destroyNo };
}

/**
 * 构建销毁报告。
 *
 * @param result 登记结果
 * @returns 销毁报告（registered + destroyNo 透传）
 */
export function buildDestroyApplyReport(result: DestroyApplyResultV14): DestroyApplyReportV14 {
  // 手算：透传 registered + destroyNo
  // 测试4：{registered=true, destroyNo='DES123456'} → registered=true, destroyNo='DES123456'
  return { registered: result.registered, destroyNo: result.destroyNo };
}
