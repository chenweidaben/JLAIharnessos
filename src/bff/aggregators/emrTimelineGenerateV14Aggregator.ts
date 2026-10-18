/**
 * 健澜科技 jlmedaios - 病历时间轴生成 V14 聚合器（M538-A）
 *
 * 纯函数：构建时间轴基础数据 + 时间轴生成 + 构建时间轴报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 时间轴基础数据 */
export interface TimelineGenerateV14 {
  recordId: string;
  patientName: string;
}

/** 时间轴生成输入 */
export interface TimelineGenerateInputV14 {
  admissionDate: string;
  dischargeDate: string;
  eventCount: number;
}

/** 时间轴生成结果 */
export interface TimelineGenerateResultV14 {
  totalDays: number;
  density: string;
}

/** 时间轴报告 */
export interface TimelineGenerateReportV14 {
  totalDays: number;
  density: string;
}

/**
 * 构建时间轴基础数据。
 *
 * @param recordId 病历ID
 * @param patientName 患者姓名
 * @returns 时间轴基础数据
 */
export function buildTimeline(recordId: string, patientName: string): TimelineGenerateV14 {
  return { recordId, patientName };
}

/**
 * 时间轴生成。
 * totalDays = Math.ceil((new Date(dischargeDate) - new Date(admissionDate)) / (1000*60*60*24))
 * density = eventCount >= 20 ? '密集' : eventCount >= 10 ? '适中' : '稀疏'
 *
 * @param input 生成输入（入院日期 + 出院日期 + 事件数）
 * @returns 生成结果（totalDays + density）
 */
export function generateTimeline(input: TimelineGenerateInputV14): TimelineGenerateResultV14 {
  // 手算：totalDays = 出院 - 入院 天数（Math.ceil 向上取整）
  // 测试2：admissionDate='2026-10-01', dischargeDate='2026-10-08' → 相差 7 天 → totalDays=7
  // 测试3：admissionDate='2026-10-01', dischargeDate='2026-10-08' → totalDays=7
  const diffMs = new Date(input.dischargeDate).getTime() - new Date(input.admissionDate).getTime();
  const totalDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  // 手算：density = eventCount >= 20 ? '密集' : eventCount >= 10 ? '适中' : '稀疏'
  // 测试2：eventCount=25 → 25>=20 → '密集'
  // 测试3：eventCount=5 → 5>=20? false; 5>=10? false → '稀疏'
  const density = input.eventCount >= 20 ? "密集" : input.eventCount >= 10 ? "适中" : "稀疏";
  return { totalDays, density };
}

/**
 * 构建时间轴报告。
 *
 * @param result 生成结果
 * @returns 时间轴报告（totalDays + density 透传）
 */
export function buildTimelineReport(result: TimelineGenerateResultV14): TimelineGenerateReportV14 {
  // 手算：透传 totalDays + density
  // 测试4：{totalDays=7, density='密集'} → totalDays=7, density='密集'
  return { totalDays: result.totalDays, density: result.density };
}
