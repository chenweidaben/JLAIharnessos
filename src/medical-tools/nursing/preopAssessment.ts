/**
 * 术前评估纯函数（M31-A）。
 */

const HIGH_ASA = new Set(['III', 'IV', 'V', 'VI']);

export function isComplete(npo: boolean, allergy: boolean, consent: boolean): boolean {
  return npo && allergy && consent;
}

export function isHighRisk(asa: string): boolean {
  return HIGH_ASA.has(asa);
}

export function missingItems(npo: boolean, allergy: boolean, consent: boolean): string[] {
  const miss: string[] = [];
  if (!npo) miss.push('npo');
  if (!allergy) miss.push('allergy');
  if (!consent) miss.push('consent');
  return miss;
}
