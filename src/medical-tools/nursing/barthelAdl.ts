/**
 * Barthel ADL 指数纯函数（M35-B）。
 */

export interface BarthelItems {
  feeding: number; bathing: number; grooming: number; dressing: number;
  bowel: number; bladder: number; toileting: number;
  transfer: number; walking: number; stairs: number;
}

export function barthelTotal(it: BarthelItems): number {
  return it.feeding + it.bathing + it.grooming + it.dressing
    + it.bowel + it.bladder + it.toileting
    + it.transfer + it.walking + it.stairs;
}

export function barthelLevel(total: number): string {
  if (total >= 100) return 'independent';
  if (total >= 60) return 'mild';
  if (total >= 40) return 'moderate';
  if (total >= 20) return 'severe';
  return 'total';
}
