/**
 * 院内感染 NISS 纯函数（M45-A）。
 */

export function infectionCategory(type: string): string {
  switch (type) {
    case 'SSI': return 'surgical_site';
    case 'CRBSI': return 'catheter_bloodstream';
    case 'CAUTI': return 'catheter_urinary';
    case 'pneumonia': return 'hospital_acquired_pneumonia';
    default: return 'other';
  }
}

export function requiresIsolation(type: string): boolean {
  return type === 'CRBSI' || type === 'pneumonia';
}

export function severity(type: string): string {
  if (type === 'CRBSI' || type === 'pneumonia') return 'high';
  return 'standard';
}
