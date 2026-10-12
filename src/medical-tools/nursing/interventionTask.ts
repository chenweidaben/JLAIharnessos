/**
 * 护理阳性自动工单纯函数（M29-C）。
 * 营养 risk=true / 疼痛 score>=4 时决定是否建工单，生成 title/finding。
 */

export function nutritionTaskShouldCreate(nutritionRisk: boolean, totalScore: number): boolean {
  return nutritionRisk && totalScore >= 3;
}
export function nutritionTaskTitle(totalScore: number): string {
  return `营养风险会诊 NRS=${totalScore}`;
}
export function nutritionTaskFinding(totalScore: number): string {
  return `NRS-2002 total=${totalScore}, nutrition risk positive, refer to dietitian`;
}

export function painTaskShouldCreate(score: number): boolean {
  return score >= 4;
}
export function painTaskTitle(score: number): string {
  return `镇痛建议 NRS=${score}`;
}
export function painTaskFinding(score: number): string {
  return score >= 7
    ? `NRS=${score} severe pain, immediate analgesia`
    : `NRS=${score} moderate pain, analgesia review`;
}
