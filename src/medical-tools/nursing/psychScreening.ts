/**
 * 心理筛查纯函数 PHQ-9 + GAD-7（M44-A）。
 */

export function phq9Level(total: number): string {
  if (total <= 4) return 'none';
  if (total <= 9) return 'mild';
  if (total <= 14) return 'moderate';
  if (total <= 19) return 'moderately_severe';
  return 'severe';
}

export function gad7Level(total: number): string {
  if (total <= 4) return 'none';
  if (total <= 9) return 'mild';
  if (total <= 14) return 'moderate';
  return 'severe';
}

export function needsReferral(phq9Total: number, gad7Total: number): boolean {
  return phq9Total >= 15 || gad7Total >= 15;
}

export function sumAnswers(answers: number[]): number {
  return answers.reduce((a, b) => a + (b || 0), 0);
}
