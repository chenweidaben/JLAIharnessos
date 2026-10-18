/**
 * 健澜科技 jlmedaios - 模板效果评估 V14 聚合器（M525-D，M525 收官）
 *
 * 纯函数：构建效果评估基础数据 + 效果评估 + 构建评估报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 效果评估基础数据 */
export interface EffectEvalV14 {
  templateName: string;
  evalPeriod: string;
}

/** 评估输入 */
export interface EffectEvalInputV14 {
  completionRate: number;
  satisfactionRate: number;
  defectReduction: number;
}

/** 评估结果 */
export interface EffectEvalResultV14 {
  effectScore: number;
  grade: string;
}

/** 评估报告 */
export interface EffectEvalReportV14 {
  effectScore: number;
  grade: string;
}

/**
 * 构建效果评估基础数据。
 *
 * @param templateName 模板名
 * @param evalPeriod 评估周期
 * @returns 效果评估基础数据
 */
export function buildEffectEval(templateName: string, evalPeriod: string): EffectEvalV14 {
  return { templateName, evalPeriod };
}

/**
 * 效果评估。
 * effectScore = Math.round((completionRate+satisfactionRate+defectReduction)/3*10)/10 保留 1 位小数；
 * grade >= 90 → '卓越'，>= 75 → '良好'，>= 60 → '合格'，否则 '待改进'。
 *
 * @param input 评估输入（完成率 + 满意度 + 缺陷降低率）
 * @returns 评估结果（effectScore + grade）
 */
export function evaluateTemplateEffect(input: EffectEvalInputV14): EffectEvalResultV14 {
  // 手算：effectScore = Math.round((completionRate+satisfactionRate+defectReduction)/3*10)/10 保留 1 位小数
  // 测试2：(95+92+90)/3 = 277/3 = 92.333... → 92.333*10 = 923.333 → Math.round(923.333)/10 = 923/10 = 92.3
  // 测试3：(80+75+70)/3 = 225/3 = 75.0 → 75.0*10 = 750 → Math.round(750)/10 = 750/10 = 75.0
  const avg = (input.completionRate + input.satisfactionRate + input.defectReduction) / 3;
  const effectScore = Math.round(avg * 10) / 10;
  // 手算：grade >= 90 → '卓越'，>= 75 → '良好'，>= 60 → '合格'，否则 '待改进'
  // 测试2：92.3 >= 90 → grade='卓越'
  // 测试3：75.0 >= 75 → grade='良好'
  let grade: string;
  if (effectScore >= 90) {
    grade = "卓越";
  } else if (effectScore >= 75) {
    grade = "良好";
  } else if (effectScore >= 60) {
    grade = "合格";
  } else {
    grade = "待改进";
  }
  return { effectScore, grade };
}

/**
 * 构建评估报告。
 *
 * @param result 评估结果
 * @returns 评估报告（effectScore + grade 透传）
 */
export function buildEffectEvalReport(result: EffectEvalResultV14): EffectEvalReportV14 {
  // 手算：透传 effectScore + grade
  // 测试4：{effectScore:92.3, grade:'卓越'} → effectScore=92.3, grade='卓越'
  return { effectScore: result.effectScore, grade: result.grade };
}
