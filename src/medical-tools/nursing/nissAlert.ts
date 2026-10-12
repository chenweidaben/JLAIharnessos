/**
 * 院感自动工单纯函数（M46-B）。
 */

export function needsTask(type: string): boolean {
  return type === 'SSI' || type === 'CRBSI' || type === 'CAUTI';
}

export function buildTask(type: string, pathogen?: string | null): { title: string; finding: string } {
  return {
    title: `院感 ${type} 改进工单`,
    finding: `infection_type=${type}${pathogen ? ` pathogen=${pathogen}` : ''}`,
  };
}
