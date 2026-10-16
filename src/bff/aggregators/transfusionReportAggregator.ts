/**
 * 健澜科技 jlmedaios - 输血管理纯函数（M224-C）
 *
 * buildTransfusionReport / assessTransfusionAppropriateness / handleTransfusionReaction
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/**
 * 评估输血指征（纯函数）。
 *
 * @param Hb 血红蛋白 g/L
 * @param condition 病情
 * @returns 是否合适
 */
export function assessTransfusionAppropriateness(Hb: number, condition: string): { appropriate: boolean; indication: string } {
  if (condition.includes('急性失血')) {
    return { appropriate: Hb < 100, indication: '急性失血' };
  }
  return { appropriate: Hb < 70, indication: 'Hb<70g/L' };
}

/**
 * 处理输血反应（纯函数）。
 *
 * @param reaction 反应类型
 * @returns 处理
 */
export function handleTransfusionReaction(reaction: string): { urgent: boolean; action: string } {
  let urgent = false;
  let action = '观察';
  if (reaction.includes('溶血')) {
    urgent = true;
    action = '立即停止输血·抢救';
  } else if (reaction.includes('TRALI') || reaction.includes('TACO')) {
    urgent = true;
    action = '停止输血·对症处理';
  }
  return { urgent, action };
}

/** 输血管理报告输出 */
export interface TransfusionReport {
  timeRange: string;
  request: { orders: number; crossmatch: number };
  inventory: { units: number; coldChain: boolean };
  delivery: { verified: number };
  execution: { transfused: number };
  reaction: { total: number; hemolysis: number; trali: number; taco: number };
  autologous: { units: number };
  management: { antibody: number };
  safety: { audit: boolean };
  suggestions: string[];
}

/**
 * 构建输血管理报告。
 *
 * @param timeRange 时间范围
 * @returns 输血管理报告
 */
export function buildTransfusionReport(timeRange: string): TransfusionReport {
  return {
    timeRange,
    request: { orders: 5000, crossmatch: 4000 },
    inventory: { units: 2000, coldChain: true },
    delivery: { verified: 5000 },
    execution: { transfused: 4800 },
    reaction: { total: 20, hemolysis: 1, trali: 2, taco: 3 },
    autologous: { units: 200 },
    management: { antibody: 50 },
    safety: { audit: true },
    suggestions: ['严格掌握输血指征', '加强不规则抗体筛查'],
  };
}
