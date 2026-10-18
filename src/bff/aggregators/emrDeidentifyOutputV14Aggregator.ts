/**
 * 健澜科技 jlmedaios - 病历脱敏输出 V14 聚合器（M528-B）
 *
 * 纯函数：构建脱敏输出基础数据 + 脱敏处理 + 构建脱敏报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 脱敏输出基础数据 */
export interface DeidentifyOutputV14 {
  recordId: string;
  fieldCount: number;
}

/** 脱敏处理输入 */
export interface DeidentifyInputV14 {
  patientName: string;
  idCard: string;
  phone: string;
}

/** 脱敏处理结果 */
export interface DeidentifyResultV14 {
  maskedName: string;
  maskedIdCard: string;
  maskedPhone: string;
}

/** 脱敏报告 */
export interface DeidentifyReportV14 {
  maskedCount: number;
}

/**
 * 构建脱敏输出基础数据。
 *
 * @param recordId 病历ID
 * @param fieldCount 字段数
 * @returns 脱敏输出基础数据
 */
export function buildDeidentifyOutput(recordId: string, fieldCount: number): DeidentifyOutputV14 {
  return { recordId, fieldCount };
}

/**
 * 脱敏处理。
 * maskedName = 姓名第1字 + '***'；
 * maskedIdCard = 身份证前6位 + '********' + 后4位；
 * maskedPhone = 手机前3位 + '****' + 后4位。
 *
 * @param input 脱敏输入（患者姓名 + 身份证 + 手机号）
 * @returns 脱敏结果（maskedName + maskedIdCard + maskedPhone）
 */
export function deidentifyPatientData(input: DeidentifyInputV14): DeidentifyResultV14 {
  // 手算：maskedName = 姓名第1字 + '***'
  // 测试2：'张三丰' → '张' + '***' = '张***'
  // 测试3：'李四' → '李' + '***' = '李***'
  const maskedName = input.patientName.charAt(0) + "***";
  // 手算：maskedIdCard = 前6位 + '********' + 后4位
  // 测试2：'110101199001011234' → '110101' + '********' + '1234' = '110101********1234'
  // 测试3：'310101198505056789' → '310101' + '********' + '6789' = '310101********6789'
  const maskedIdCard =
    input.idCard.substring(0, 6) + "********" + input.idCard.substring(input.idCard.length - 4);
  // 手算：maskedPhone = 前3位 + '****' + 后4位
  // 测试2：'13812345678' → '138' + '****' + '5678' = '138****5678'
  // 测试3：'13987654321' → '139' + '****' + '4321' = '139****4321'
  const maskedPhone =
    input.phone.substring(0, 3) + "****" + input.phone.substring(input.phone.length - 4);
  return { maskedName, maskedIdCard, maskedPhone };
}

/**
 * 构建脱敏报告。
 *
 * @param result 脱敏结果
 * @returns 脱敏报告（maskedCount=3，3 字段都脱敏了）
 */
export function buildDeidentifyOutputReport(_result: DeidentifyResultV14): DeidentifyReportV14 {
  // 手算：maskedCount = 3（姓名 + 身份证 + 手机，3 字段都脱敏）
  // 测试4：maskedCount=3
  return { maskedCount: 3 };
}
