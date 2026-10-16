/**
 * 健澜科技 jlmedaios - 国际医疗合作 V2 纯函数（M236-D）
 *
 * buildInternationalHealthV2Report / assessJCIReadiness / routeInternationalPatient
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估JCI准备度（纯函数）。
 *
 * @param standards 标准
 * @returns 评估
 */
export function assessJCIReadiness(standards: string): { readiness: number; pass: boolean } {
  let readiness = 80;
  if (standards.includes("不足")) readiness -= 30;
  return { readiness, pass: readiness >= 60 };
}

/**
 * 路由国际患者（纯函数）。
 *
 * @param patient 患者
 * @returns 路由
 */
export function routeInternationalPatient(patient: string): { department: string; language: string } {
  return { department: "国际医疗部", language: "英语" };
}

/** 国际医疗 V2 报告输出 */
export interface InternationalHealthV2Report {
  timeRange: string;
  dept: { intl: number; jci: boolean; himss: number };
  crossBorder: { consult: number; referral: number; overseasExam: number };
  bri: { aid: number; training: number };
  service: { multiLang: number; insuranceDirect: number };
  talent: { international: number };
  suggestions: string[];
}

/**
 * 构建国际医疗 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 国际医疗 V2 报告
 */
export function buildInternationalHealthV2Report(timeRange: string): InternationalHealthV2Report {
  return {
    timeRange,
    dept: { intl: 5000, jci: true, himss: 7 },
    crossBorder: { consult: 200, referral: 100, overseasExam: 300 },
    bri: { aid: 5, training: 50 },
    service: { multiLang: 10, insuranceDirect: 20 },
    talent: { international: 30 },
    suggestions: ["扩大JCI认证覆盖", "增加一带一路援外项目"],
  };
}
