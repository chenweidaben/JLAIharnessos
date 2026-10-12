/**
 * ICU RASS 镇静评分纯函数（M33-A）。
 */

export function rassLevel(score: number): string {
  switch (score) {
    case -5: return 'unarousable';
    case -4: return 'deep_sedation';
    case -3: return 'moderate_sedation';
    case -2: return 'light_sedation';
    case -1: return 'drowsy';
    case 0:  return 'alert_calm';
    case 1:  return 'restless';
    case 2:  return 'agitated';
    case 3:  return 'very_agitated';
    case 4:  return 'combative';
    default: return 'unknown';
  }
}

export function withinTarget(actual: number, target: number): boolean {
  return Math.abs(actual - target) <= 1;
}

export function overSedated(actual: number): boolean {
  return actual <= -3;
}
