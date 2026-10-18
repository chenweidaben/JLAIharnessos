/**
 * 健澜科技 jlmedaios - DRG 病案质控 V14 聚合器（M480-A）
 *
 * 纯函数：DRG 病案合规校验 + DRG 权重计算。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 质控输入数据 */
export interface DrgQcInputV14 {
  primaryDx: string;
  secondaryDx: string[];
  procedures: string[];
}

/** DRG 质控结果 */
export interface DrgQcResultV14 {
  compliant: boolean;
  issues: string[];
}

/**
 * DRG 病案合规校验：主诊断非空 + 手术操作非空。
 *
 * @param data 病案数据
 * @returns 质控结果
 */
export function checkDrgCompliance(data: DrgQcInputV14): DrgQcResultV14 {
  const issues: string[] = [];
  if (!data.primaryDx || data.primaryDx.trim() === "") {
    issues.push("主诊断为空");
  }
  if (!data.procedures || data.procedures.length === 0) {
    issues.push("无手术操作");
  }
  return { compliant: issues.length === 0, issues };
}

/**
 * 计算 DRG 权重：baseWeight × complicationFactor，保留 2 位小数。
 *
 * @param baseWeight 基础权重
 * @param complicationFactor 并发症系数
 * @returns DRG 权重（保留 2 位小数）
 */
export function computeDrgWeight(baseWeight: number, complicationFactor: number): number {
  return Math.round(baseWeight * complicationFactor * 100) / 100;
}
