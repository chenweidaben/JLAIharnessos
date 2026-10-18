/**
 * 健澜科技 jlmedaios - 病历检验异常值提醒 V14 聚合器（M537-C）
 *
 * 纯函数：构建检验提醒基础数据 + 异常值检测 + 构建提醒报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 检验提醒基础数据 */
export interface LabAlertV14 {
  recordId: string;
  dept: string;
}

/** 异常值检测输入 */
export interface LabAlertInputV14 {
  testName: string;
  value: number;
  normalMin: number;
  normalMax: number;
}

/** 异常值检测结果 */
export interface LabAlertResultV14 {
  abnormal: boolean;
  direction: string;
  message: string;
}

/** 异常值提醒报告 */
export interface LabAlertReportV14 {
  abnormal: boolean;
  direction: string;
  message: string;
}

/**
 * 构建检验提醒基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns 检验提醒基础数据
 */
export function buildLabAlert(recordId: string, dept: string): LabAlertV14 {
  return { recordId, dept };
}

/**
 * 异常值检测。
 * abnormal = value < normalMin || value > normalMax
 * direction = value < normalMin ? '偏低' : value > normalMax ? '偏高' : '正常'
 * message = abnormal ? testName + direction + '，请关注' : '正常范围'
 *
 * @param input 检测输入（检验项 + 实测值 + 参考下限 + 参考上限）
 * @returns 检测结果（abnormal + direction + message）
 */
export function detectAbnormalLab(input: LabAlertInputV14): LabAlertResultV14 {
  // 手算：abnormal = value < normalMin || value > normalMax
  // 测试2：value=12.5, normalMax=10 → 12.5>10=true → abnormal=true
  // 测试3：value=130, normalMin=110, normalMax=160 → 130>=110 && 130<=160 → abnormal=false
  const abnormal = input.value < input.normalMin || input.value > input.normalMax;
  // 手算：direction = 偏低 / 偏高 / 正常
  // 测试2：12.5>10 → '偏高'
  // 测试3：110<=130<=160 → '正常'
  const direction = input.value < input.normalMin ? "偏低" : input.value > input.normalMax ? "偏高" : "正常";
  // 手算：message = 异常项+方向+'，请关注' / '正常范围'
  // 测试2：'白细胞偏高，请关注'
  // 测试3：'正常范围'
  const message = abnormal ? input.testName + direction + "，请关注" : "正常范围";
  return { abnormal, direction, message };
}

/**
 * 构建提醒报告。
 *
 * @param result 检测结果
 * @returns 提醒报告（abnormal + direction + message 透传）
 */
export function buildLabAlertReport(result: LabAlertResultV14): LabAlertReportV14 {
  // 手算：透传 abnormal + direction + message
  // 测试4：{abnormal=true, direction='偏高', message='白细胞偏高，请关注'} → 透传
  return { abnormal: result.abnormal, direction: result.direction, message: result.message };
}
