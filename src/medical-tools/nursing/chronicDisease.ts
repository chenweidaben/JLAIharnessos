/**
 * 慢病管理纯函数（M39-A）。
 */

export function hypertensionControl(sbp: number | null, dbp: number | null): boolean {
  if (sbp == null || dbp == null) return false;
  return sbp < 140 && dbp < 90;
}

export function hypertensionCritical(sbp: number | null, dbp: number | null): boolean {
  if (sbp == null || dbp == null) return false;
  return sbp >= 180 || dbp >= 110;
}

export function diabetesControl(fpg: number | null, hba1c: number | null): boolean {
  if (fpg == null || hba1c == null) return false;
  return fpg < 7.0 && hba1c < 7.0;
}

export function diabetesCritical(fpg: number | null, hba1c: number | null): boolean {
  if (fpg == null) return false;
  return fpg >= 11.1 || (hba1c != null && hba1c >= 10);
}

export function abnormalLevel(disease: 'hypertension' | 'diabetes', sbp?: number | null, dbp?: number | null, fpg?: number | null, hba1c?: number | null): string {
  if (disease === 'hypertension') {
    if (hypertensionCritical(sbp ?? null, dbp ?? null)) return 'critical';
    return hypertensionControl(sbp ?? null, dbp ?? null) ? 'controlled' : 'abnormal';
  }
  if (diabetesCritical(fpg ?? null, hba1c ?? null)) return 'critical';
  return diabetesControl(fpg ?? null, hba1c ?? null) ? 'controlled' : 'abnormal';
}
