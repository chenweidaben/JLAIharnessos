/**
 * 健澜科技 jlmedaios - 医保与应急管理看板 API（M483）
 * 对接 BFF ：
 *   /insurance/expense-audit      不合理费用审核
 *   /insurance/drg-settlement    DRG 结算
 *   /insurance/dip-settlement    DIP 结算
 *   /insurance/rejection          拒付明细
 *   /emergency/plans              应急预案
 *   /emergency/supplies           应急物资
 * BFF 不可用时返回确定性 DEMO 兜底数据并标记 demo=true。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

export interface ExpenseAuditRow {
  id: string;
  dept: string;
  item: string;
  amount: number;
  status: 'pending' | 'confirmed' | 'rectified' | 'appealed';
  demo?: boolean;
}

export interface DrgSettlementRow {
  id: string;
  group: string;
  cases: number;
  rate: number; // 结算率 %
  variance: number; // 费用偏差 ±%
  demo?: boolean;
}

export interface DipSettlementRow {
  id: string;
  dept: string;
  totalPoints: number;
  unitPrice: number;
  settlement: number;
  demo?: boolean;
}

export interface RejectionRow {
  id: string;
  reason: string;
  visits: number;
  amount: number;
  appealStatus: 'open' | 'appealing' | 'won' | 'lost';
  demo?: boolean;
}

export interface EmergencyPlanRow {
  id: string;
  plan: string;
  level: 'I' | 'II' | 'III' | 'IV';
  lastDrill: string;
  nextDrill: string;
  status: 'ready' | 'due' | 'expired';
  demo?: boolean;
}

export interface EmergencySupplyRow {
  id: string;
  item: string;
  stock: number;
  unit: string;
  expiry: string;
  demo?: boolean;
}

const DEMO_AUDIT: ExpenseAuditRow[] = [
  { id: 'a-1', dept: '心内科', item: '超量营养类注射剂', amount: 18600, status: 'confirmed', demo: true },
  { id: 'a-2', dept: '骨科', item: '高值耗材未匹配病组', amount: 42300, status: 'pending', demo: true },
  { id: 'a-3', dept: '普外科', item: '重复化验检查', amount: 8200, status: 'rectified', demo: true },
  { id: 'a-4', dept: '呼吸内科', item: '抗菌药物超疗程', amount: 12400, status: 'appealed', demo: true },
  { id: 'a-5', dept: '神经内科', item: '自费项目未签署知情', amount: 5600, status: 'pending', demo: true },
];

const DEMO_DRG: DrgSettlementRow[] = [
  { id: 'd-1', group: 'FM19 心力衰竭', cases: 420, rate: 92.5, variance: 3.2, demo: true },
  { id: 'd-2', group: 'GB29 冠脉支架', cases: 180, rate: 86.4, variance: -12.6, demo: true },
  { id: 'd-3', group: 'IB29 阑尾手术', cases: 96, rate: 95.8, variance: 5.1, demo: true },
  { id: 'd-4', group: 'ES15 肺炎', cases: 260, rate: 88.1, variance: -6.8, demo: true },
  { id: 'd-5', group: 'BR25 脑卒中', cases: 148, rate: 81.3, variance: 14.2, demo: true },
];

const DEMO_DIP: DipSettlementRow[] = [
  { id: 'p-1', dept: '心内科', totalPoints: 18600, unitPrice: 82.5, settlement: 1534500, demo: true },
  { id: 'p-2', dept: '骨科', totalPoints: 12400, unitPrice: 82.5, settlement: 1023000, demo: true },
  { id: 'p-3', dept: '普外科', totalPoints: 9800, unitPrice: 82.5, settlement: 808500, demo: true },
  { id: 'p-4', dept: '呼吸内科', totalPoints: 7600, unitPrice: 82.5, settlement: 627000, demo: true },
];

const DEMO_REJECT: RejectionRow[] = [
  { id: 'r-1', reason: '出院诊断与病案首页不一致', visits: 32, amount: 86000, appealStatus: 'appealing', demo: true },
  { id: 'r-2', reason: '高值耗材单独收费未匹配', visits: 18, amount: 124000, appealStatus: 'open', demo: true },
  { id: 'r-3', reason: '抗菌药物使用天数超限', visits: 45, amount: 38000, appealStatus: 'won', demo: true },
  { id: 'r-4', reason: '检查检验结果无关联医嘱', visits: 22, amount: 24000, appealStatus: 'lost', demo: true },
];

const DEMO_PLANS: EmergencyPlanRow[] = [
  { id: 'ep-1', plan: '批量伤员救治应急预案', level: 'I', lastDrill: '2026-06-15', nextDrill: '2026-12-15', status: 'ready', demo: true },
  { id: 'ep-2', plan: '突发公共卫生事件', level: 'I', lastDrill: '2026-04-10', nextDrill: '2026-10-10', status: 'due', demo: true },
  { id: 'ep-3', plan: '院感暴发应急响应', level: 'II', lastDrill: '2026-08-20', nextDrill: '2027-02-20', status: 'ready', demo: true },
  { id: 'ep-4', plan: '信息系统中断应急预案', level: 'II', lastDrill: '2026-01-05', nextDrill: '2026-07-05', status: 'expired', demo: true },
];

const DEMO_SUPPLIES: EmergencySupplyRow[] = [
  { id: 's-1', item: '防护服(医用)', stock: 5000, unit: '套', expiry: '2027-06-30', demo: true },
  { id: 's-2', item: 'N95 口罩', stock: 12000, unit: '只', expiry: '2026-12-31', demo: true },
  { id: 's-3', item: '急救药品(肾上腺素)', stock: 800, unit: '支', expiry: '2026-11-30', demo: true },
  { id: 's-4', item: '便携式呼吸机', stock: 24, unit: '台', expiry: '2028-03-31', demo: true },
  { id: 's-5', item: '应急血袋', stock: 60, unit: '袋', expiry: '2026-10-25', demo: true },
];

async function safeGet<T>(url: string, fallback: T[]): Promise<{ data: T[]; demo: boolean }> {
  try {
    const res = await get<{ items?: T[] } | T[]>(url);
    const items = Array.isArray(res) ? (res as T[]) : ((res as { items?: T[] })?.items ?? []);
    if (items.length > 0) return { data: items, demo: false };
    return { data: fallback, demo: true };
  } catch {
    return { data: fallback, demo: true };
  }
}

export const fetchExpenseAudit = () =>
  safeGet<ExpenseAuditRow>('/insurance/expense-audit', DEMO_AUDIT);
export const fetchDrgSettlement = () =>
  safeGet<DrgSettlementRow>('/insurance/drg-settlement', DEMO_DRG);
export const fetchDipSettlement = () =>
  safeGet<DipSettlementRow>('/insurance/dip-settlement', DEMO_DIP);
export const fetchRejection = () =>
  safeGet<RejectionRow>('/insurance/rejection', DEMO_REJECT);
export const fetchEmergencyPlans = () =>
  safeGet<EmergencyPlanRow>('/emergency/plans', DEMO_PLANS);
export const fetchEmergencySupplies = () =>
  safeGet<EmergencySupplyRow>('/emergency/supplies', DEMO_SUPPLIES);
