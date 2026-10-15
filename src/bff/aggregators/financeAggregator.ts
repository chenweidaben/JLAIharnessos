/**
 * 健澜科技 jlmedaios - 医院财务管理聚合器（M139-D · 医院运营管理）
 *
 * 【医院运营管理】财务报表清晰，院长一眼看懂钱花在哪了。
 *   - recordTransaction：登记一笔收支流水（纯函数组包 + 进程内台账）；
 *   - buildFinanceReport：按账期生成财务报表（收入合计 / 支出合计 / 净额 /
 *     分类汇总 / 科室分摊）。
 *
 * 口径约定（与 clinical.finance_transaction CHECK 约束一致）：
 *   收入 income：outpatient 门诊 / inpatient 住院 / drug 药品 / exam 检查
 *   支出 expense：salary 人员工资 / drug_purchase 药品采购 /
 *                equipment_purchase 设备采购 / consumable_purchase 耗材采购 /
 *                utilities 水电费
 *
 * 与全仓聚合器约定一致：
 *   - recordTransaction / aggregateReport 为纯计算（校验、组包、汇总），不修改入参；
 *   - 进程内台账 ledger 是报表查询的在读索引；PostgreSQL 为持久化流水，
 *     落库为 best-effort（断库 / 表未迁移时降级，不阻断登记与报表主流程）。
 *
 * 金额统一保留两位小数（人民币元），避免浮点误差导致报表对不上账。
 * 不触碰 WebSocket，不新增依赖（uuid 取自 node 内置 crypto）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { randomUUID } from 'node:crypto';
import { getDb } from '../../db/pool.js';

/* ------------------------------------------------------------------ */
/* 类型与口径                                                           */
/* ------------------------------------------------------------------ */

/** 收支方向：income 收入 / expense 支出 */
export type FinanceType = 'income' | 'expense';

/** 收入类别代码 */
export const INCOME_CATEGORIES = ['outpatient', 'inpatient', 'drug', 'exam'] as const;
/** 支出类别代码 */
export const EXPENSE_CATEGORIES = [
  'salary',
  'drug_purchase',
  'equipment_purchase',
  'consumable_purchase',
  'utilities',
] as const;

export type IncomeCategory = (typeof INCOME_CATEGORIES)[number];
export type ExpenseCategory = (typeof EXPENSE_CATEGORIES)[number];

/** 类别元数据：代码 → 中文标签 + 方向 */
const CATEGORY_META: Readonly<Record<string, { label: string; type: FinanceType }>> = {
  outpatient: { label: '门诊收入', type: 'income' },
  inpatient: { label: '住院收入', type: 'income' },
  drug: { label: '药品收入', type: 'income' },
  exam: { label: '检查收入', type: 'income' },
  salary: { label: '人员工资', type: 'expense' },
  drug_purchase: { label: '药品采购', type: 'expense' },
  equipment_purchase: { label: '设备采购', type: 'expense' },
  consumable_purchase: { label: '耗材采购', type: 'expense' },
  utilities: { label: '水电费', type: 'expense' },
};

/** 一笔收支流水（BFF 对外形态，camelCase） */
export interface Transaction {
  /** 流水唯一标识 */
  id: string;
  /** 收支方向 */
  type: FinanceType;
  /** 类别代码 */
  category: string;
  /** 类别中文标签（报表直接展示，院长看得懂） */
  categoryLabel: string;
  /** 金额（正数，单位元，两位小数） */
  amount: number;
  /** 费用归属科室 */
  dept: string;
  /** 摘要 */
  description: string;
  /** 入账时间 ISO 串 */
  recordedAt: string;
}

/** 某一类别的收支汇总 */
export interface CategoryTotal {
  category: string;
  categoryLabel: string;
  amount: number;
  count: number;
}

/** 科室分摊：该科室赚了多少、花了多少、净贡献多少 */
export interface DeptAllocation {
  dept: string;
  income: number;
  expense: number;
  net: number;
  txnCount: number;
}

/** 财务报表（院长驾驶舱） */
export interface Report {
  startDate: string;
  endDate: string;
  /** 收入合计 */
  totalIncome: number;
  /** 支出合计 */
  totalExpense: number;
  /** 净结余 = 收入合计 - 支出合计 */
  netProfit: number;
  /** 收入分类汇总 */
  incomeByCategory: CategoryTotal[];
  /** 支出分类汇总（院长一眼看懂钱花在哪） */
  expenseByCategory: CategoryTotal[];
  /** 科室分摊 */
  deptAllocations: DeptAllocation[];
  /** 流水笔数 */
  transactionCount: number;
  generatedAt: string;
}

/** recordTransaction 的可选元数据（测试/回放用） */
export interface TransactionMeta {
  /** 覆盖入账时间（测试用）；缺省取当前时钟 */
  recordedAt?: string;
}

/* ------------------------------------------------------------------ */
/* 进程内收支台账（报表查询的在读索引）                                 */
/* ------------------------------------------------------------------ */

const ledger: Transaction[] = [];

/** 两位小数（人民币元），消除浮点误差 */
function round2(n: number): number {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/* ------------------------------------------------------------------ */
/* 对外纯函数                                                          */
/* ------------------------------------------------------------------ */

/**
 * 【医院运营管理】登记一笔收支流水。
 *
 * 组包 → 校验 → 写入进程内台账 → 返回流水副本。
 * 入参不合法（方向/类别不匹配、金额非正、科室为空）时抛错，由路由层收敛为 400。
 * amount 一律按正数入账，收支方向由 type 决定。
 */
export function recordTransaction(
  type: FinanceType,
  category: string,
  amount: number,
  dept: string,
  description: string,
  meta?: TransactionMeta,
): Transaction {
  if (type !== 'income' && type !== 'expense') {
    throw new Error(`非法收支方向 type=${String(type)}（仅 income / expense）`);
  }
  const metaCat = CATEGORY_META[category];
  if (!metaCat) {
    throw new Error(`非法财务类别 category=${String(category)}`);
  }
  if (metaCat.type !== type) {
    throw new Error(
      `类别 ${categoryLabelSafe(category)} 属于${metaCat.type === 'income' ? '收入' : '支出'}，与方向 ${type} 不一致`,
    );
  }
  if (typeof amount !== 'number' || !Number.isFinite(amount) || amount <= 0) {
    throw new Error('金额 amount 必须为大于 0 的数字');
  }
  if (!dept || typeof dept !== 'string' || !dept.trim()) {
    throw new Error('归属科室 dept 不能为空');
  }

  const txn: Transaction = {
    id: randomUUID(),
    type,
    category,
    categoryLabel: metaCat.label,
    amount: round2(amount),
    dept: dept.trim(),
    description: (description ?? '').toString().trim(),
    recordedAt: meta?.recordedAt ?? new Date().toISOString(),
  };
  ledger.push(txn);
  return { ...txn };
}

function categoryLabelSafe(category: string): string {
  return CATEGORY_META[category]?.label ?? category;
}

/**
 * 纯计算核心：在给定流水集合上，按账期 [startDate, endDate] 汇总出财务报表。
 * 不读全局台账、不修改入参，便于单测直接喂数据集验证。
 */
export function aggregateTransactions(
  txns: readonly Transaction[],
  startDate: string,
  endDate: string,
): Report {
  const from = new Date(startDate);
  from.setHours(0, 0, 0, 0);
  const to = new Date(endDate);
  to.setHours(23, 59, 59, 999);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw new Error('账期 startDate / endDate 非法（应为 YYYY-MM-DD 或 ISO 时间）');
  }
  if (from.getTime() > to.getTime()) {
    throw new Error('账期起始日不能晚于结束日');
  }

  const inRange = txns.filter((t) => {
    const d = new Date(t.recordedAt).getTime();
    return d >= from.getTime() && d <= to.getTime();
  });

  let totalIncome = 0;
  let totalExpense = 0;
  const incomeMap = new Map<string, CategoryTotal>();
  const expenseMap = new Map<string, CategoryTotal>();
  const deptMap = new Map<string, DeptAllocation>();

  for (const t of inRange) {
    if (t.type === 'income') totalIncome = round2(totalIncome + t.amount);
    else totalExpense = round2(totalExpense + t.amount);

    const target = t.type === 'income' ? incomeMap : expenseMap;
    const cur = target.get(t.category) ?? {
      category: t.category,
      categoryLabel: t.categoryLabel,
      amount: 0,
      count: 0,
    };
    cur.amount = round2(cur.amount + t.amount);
    cur.count += 1;
    target.set(t.category, cur);

    const dept = deptMap.get(t.dept) ?? {
      dept: t.dept,
      income: 0,
      expense: 0,
      net: 0,
      txnCount: 0,
    };
    if (t.type === 'income') dept.income = round2(dept.income + t.amount);
    else dept.expense = round2(dept.expense + t.amount);
    dept.txnCount += 1;
    deptMap.set(t.dept, dept);
  }

  const incomeByCategory = Array.from(incomeMap.values()).sort((a, b) => b.amount - a.amount);
  const expenseByCategory = Array.from(expenseMap.values()).sort((a, b) => b.amount - a.amount);
  const deptAllocations = Array.from(deptMap.values())
    .map((d) => ({ ...d, net: round2(d.income - d.expense) }))
    .sort((a, b) => b.net - a.net);

  return {
    startDate,
    endDate,
    totalIncome,
    totalExpense,
    netProfit: round2(totalIncome - totalExpense),
    incomeByCategory,
    expenseByCategory,
    deptAllocations,
    transactionCount: inRange.length,
    generatedAt: new Date().toISOString(),
  };
}

/**
 * 【医院运营管理】按账期生成财务报表（院长驾驶舱）。
 * 从进程内台账过滤账期后，调用纯计算核心 aggregateTransactions 汇总。
 */
export function buildFinanceReport(startDate: string, endDate: string): Report {
  return aggregateTransactions(ledger, startDate, endDate);
}

/** 测试专用：清空进程内台账，保证用例之间互不污染。 */
export function resetFinanceLedger(): void {
  ledger.length = 0;
}

/* ------------------------------------------------------------------ */
/* 薄持久化层：best-effort 写入 PostgreSQL，失败降级不阻断               */
/* ------------------------------------------------------------------ */

/**
 * 把已登记的流水落库到 clinical.finance_transaction。
 * 由路由层在 recordTransaction 之后显式 await；断库 / 表未迁移时静默降级，
 * 进程内台账仍可生成报表，持久化留待重连后补写。
 */
export async function persistTransaction(txn: Transaction): Promise<void> {
  try {
    const db = getDb();
    await db`
      INSERT INTO clinical.finance_transaction
        (id, type, category, amount, dept, description, recorded_at)
      VALUES
        (${txn.id}, ${txn.type}, ${txn.category}, ${txn.amount},
         ${txn.dept}, ${txn.description}, ${txn.recordedAt}::timestamptz)
      ON CONFLICT (id) DO NOTHING
    `;
  } catch {
    // 断库 / 表未迁移：进程内台账仍可出报表，流水落库留待重连后补写
  }
}
