/**
 * 肿瘤随访 CTCAE 纯函数（M41-A）。
 */

export function ctcaeSeverity(grade: number): string {
  switch (grade) {
    case 0: return 'none';
    case 1: return 'mild';
    case 2: return 'moderate';
    case 3: return 'severe';
    case 4: return 'life_threatening';
    case 5: return 'death';
    default: return 'unknown';
  }
}

export function isSevere(grade: number): boolean {
  return grade >= 3;
}
