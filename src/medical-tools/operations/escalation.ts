/**
 * 健澜科技 jlmedaios - 整改升级纯函数（M22-F）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export function shouldEscalate(verdict: string): boolean {
  return verdict === 'worse' || verdict === 'no_improvement';
}

export function nextLevel(currentLevel: number): number {
  return currentLevel + 1;
}
