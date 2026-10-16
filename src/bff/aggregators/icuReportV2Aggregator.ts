/**
 * 健澜科技 jlmedaios - 重症医学 V2 纯函数（M224-D）
 *
 * buildICUReportV2 / calculateAPACHEII / assessSOFA
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 计算 APACHE II（纯函数）。
 *
 * @param vitals 生命体征异常数
 * @param labs 化验异常数
 * @returns 评分
 */
export function calculateAPACHEII(vitals: number, labs: number): { score: number; mortality: number } {
  const score = vitals * 4 + labs * 2;
  const mortality = Math.min(80, Math.round(score * 2.5));
  return { score, mortality };
}

/**
 * 评估 SOFA 评分（纯函数）。
 *
 * @param organ 器官数
 * @param functionLoss 功能不全器官数
 * @returns 评分
 */
export function assessSOFA(organ: number, functionLoss: number): { score: number; critical: boolean } {
  const score = functionLoss * 4;
  return { score, critical: functionLoss >= 3 };
}

/** 重症医学 V2 报告输出 */
export interface ICUReportV2 {
  timeRange: string;
  admission: { patients: number; apache: number };
  organ: { respiratory: number; circulatory: number; crrt: number; ecmo: number };
  monitoring: { beds: number };
  infection: { vap: number; clabsi: number; cauti: number; mdro: number };
  nutrition: { enteral: number };
  sedation: { rass: number; cam: number };
  discharge: { survived: number };
  management: { pics: number };
  suggestions: string[];
}

/**
 * 构建重症医学 V2 报告。
 *
 * @param timeRange 时间范围
 * @returns 重症医学 V2 报告
 */
export function buildICUReportV2(timeRange: string): ICUReportV2 {
  return {
    timeRange,
    admission: { patients: 500, apache: 20 },
    organ: { respiratory: 400, circulatory: 200, crrt: 50, ecmo: 5 },
    monitoring: { beds: 30 },
    infection: { vap: 10, clabsi: 8, cauti: 12, mdro: 30 },
    nutrition: { enteral: 400 },
    sedation: { rass: 500, cam: 100 },
    discharge: { survived: 350 },
    management: { pics: 20 },
    suggestions: ['降低 VAP/CLABSI 率', '加强 PICS 随访'],
  };
}
