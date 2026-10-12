/**
 * 康复工单触发纯函数（M36-A）。
 */

export function needsRehabTherapy(totalScore: number): boolean {
  return totalScore < 40;
}

export function rehabTaskTitle(totalScore: number): string {
  return `Barthel=${totalScore} 需康复介入`;
}

export function rehabTaskFinding(totalScore: number): string {
  return `barthel total=${totalScore} < 40 (moderate/severe/total dependence)`;
}
