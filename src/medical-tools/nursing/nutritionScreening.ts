/**
 * NRS-2002 营养风险筛查纯函数。
 * 三项打分：营养状态(0-3) + 疾病严重度(0-3) + 年龄>=70 加 1 分。
 * 总分 >= 3 分 => 存在营养风险，建议营养科会诊。
 */

export interface NutritionInput {
  nutritionScore: number;   // 0-3
  diseaseSeverity: number;  // 0-3
  ageYears: number;
}

export interface NutritionResult {
  nutritionScore: number;
  diseaseSeverity: number;
  ageBonus: number;
  totalScore: number;
  nutritionRisk: boolean;
  advice: string;
}

export function ageBonus(ageYears: number): number {
  return ageYears >= 70 ? 1 : 0;
}

export function assessNutrition(input: NutritionInput): NutritionResult {
  if (input.nutritionScore < 0 || input.nutritionScore > 3) {
    throw new Error('nutritionScore must be 0..3');
  }
  if (input.diseaseSeverity < 0 || input.diseaseSeverity > 3) {
    throw new Error('diseaseSeverity must be 0..3');
  }
  const ab = ageBonus(input.ageYears);
  const total = input.nutritionScore + input.diseaseSeverity + ab;
  const risk = total >= 3;
  return {
    nutritionScore: input.nutritionScore,
    diseaseSeverity: input.diseaseSeverity,
    ageBonus: ab,
    totalScore: total,
    nutritionRisk: risk,
    advice: risk ? '营养风险阳性，建议营养科会诊并制定营养支持计划' : '暂无营养风险，常规随访',
  };
}
