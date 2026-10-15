/**
 * 健澜科技 jlmedaios - M139-C 物资耗材管理聚合器（医院运营管理）
 *
 * 库存红线：库存准确、账实不符即事故。本模块用纯函数维护物资台账：
 *  - recordSupplyIn(itemId, quantity, batchNo)：入库，在库存累加，更新批次；
 *  - recordSupplyOut(itemId, quantity, dept, patientId)：出库，校验库存充足后扣减，
 *    库存不足直接抛错——数据库 CHECK(quantity>=0) 之外，应用层先一步杜绝负库存；
 *  - getLowStockAlerts()：扫描全量库存，返回在库 < 安全库存的预警（缺货优先、缺口降序）。
 *
 * 纯函数约定：不访问数据库、不发网络、不读时钟副作用（时间戳仅取当前时刻用于展示）；
 * 状态保存在模块内的内存台账中，可通过 resetSupplyStore() 在测试/启动时重建。
 *
 * 医疗/运营安全定位：本模块仅做账与预警，不触发自动采购、不替代物资科盘点决策。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

// ---------------------------------------------------------------------------
// 类型
// ---------------------------------------------------------------------------

/** 物资类别：一次性耗材 / 消毒用品 / 检验试剂 / 办公用品 */
export type SupplyCategory = 'disposable' | 'disinfect' | 'reagent' | 'office';

/** 库存行（纯数据，无 I/O） */
export interface Stock {
  /** 物资编码（业务唯一键） */
  itemId: string;
  /** 物资名称 */
  name: string;
  /** 物资类别 */
  category: SupplyCategory;
  /** 计量单位 */
  unit: string;
  /** 当前在库存数量（>= 0） */
  quantity: number;
  /** 当前批次（可空） */
  batchNo: string | null;
  /** 安全库存阈值 */
  minStock: number;
  /** 最近一次变动时间（ISO） */
  updatedAt: string;
  /** 库存状态：normal 正常 / low 偏低 / out 缺货 */
  status: 'normal' | 'low' | 'out';
}

/** 低库存预警项 */
export interface Alert {
  itemId: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  /** 当前在库 */
  quantity: number;
  /** 安全库存阈值 */
  minStock: number;
  /** 缺口 = 安全库存 - 当前在库 */
  shortfall: number;
  /** out=已缺货（在库为 0）/ low=低于安全库存 */
  level: 'out' | 'low';
  message: string;
}

/** 目录条目（物资主数据） */
interface CatalogEntry {
  itemId: string;
  name: string;
  category: SupplyCategory;
  unit: string;
  minStock: number;
}

// ---------------------------------------------------------------------------
// 物资目录（种子主数据：覆盖四大类别）
// ---------------------------------------------------------------------------

const CATALOG: CatalogEntry[] = [
  { itemId: 'S001', name: '一次性使用注射器 5ml', category: 'disposable', unit: '支', minStock: 500 },
  { itemId: 'S002', name: '一次性输液器', category: 'disposable', unit: '套', minStock: 300 },
  { itemId: 'S003', name: '医用外科口罩', category: 'disposable', unit: '只', minStock: 2000 },
  { itemId: 'S004', name: '含氯消毒片', category: 'disinfect', unit: '瓶', minStock: 100 },
  { itemId: 'S005', name: '75% 医用酒精', category: 'disinfect', unit: '瓶', minStock: 120 },
  { itemId: 'S006', name: '血常规试剂条', category: 'reagent', unit: '盒', minStock: 60 },
  { itemId: 'S007', name: '生化试剂套装', category: 'reagent', unit: '盒', minStock: 40 },
  { itemId: 'S008', name: 'A4 复印纸', category: 'office', unit: '包', minStock: 80 },
  { itemId: 'S009', name: '办公用笔（盒）', category: 'office', unit: '盒', minStock: 30 },
];

export const CATEGORY_LABEL: Record<SupplyCategory, string> = {
  disposable: '一次性耗材',
  disinfect: '消毒用品',
  reagent: '检验试剂',
  office: '办公用品',
};

// ---------------------------------------------------------------------------
// 内存台账（纯函数的状态载体，不触网、不读库）
// ---------------------------------------------------------------------------

const ledger = new Map<string, Stock>();

function nowIso(): string {
  return new Date().toISOString();
}

function applyStatus(s: Stock): void {
  if (s.quantity <= 0) s.status = 'out';
  else if (s.quantity < s.minStock) s.status = 'low';
  else s.status = 'normal';
}

/** 由目录重建空台账 */
function resetStore(): void {
  ledger.clear();
  for (const c of CATALOG) {
    ledger.set(c.itemId, {
      itemId: c.itemId,
      name: c.name,
      category: c.category,
      unit: c.unit,
      quantity: 0,
      batchNo: null,
      minStock: c.minStock,
      updatedAt: nowIso(),
      status: 'out',
    });
  }
}

// 模块加载即初始化一份空台账
resetStore();

/**
 * 重建台账。测试或冷启动时调用；可传入 openingStock 设置期初库存，便于演示/对账。
 * @param openingStock itemId -> 期初在库存（非负整数）
 */
export function resetSupplyStore(openingStock?: Record<string, number>): void {
  resetStore();
  if (openingStock && typeof openingStock === 'object') {
    for (const [id, q] of Object.entries(openingStock)) {
      const s = ledger.get(id);
      const n = Math.floor(Number(q));
      if (s && Number.isFinite(n) && n >= 0) {
        s.quantity = n;
        applyStatus(s);
      }
    }
  }
}

/** 深拷贝一份库存行返回，避免外部改写污染台账 */
function snapshot(s: Stock): Stock {
  return { ...s };
}

/** 解析并校验数量：必须为正整数，否则抛错 */
function toPositiveInt(quantity: unknown, field: string): number {
  const n = Number(quantity);
  if (!Number.isFinite(n) || !Number.isInteger(n) || n <= 0) {
    throw new Error(`${field} 必须为正整数`);
  }
  return n;
}

/** 取台账行，不存在则抛错 */
function requireItem(itemId: unknown): Stock {
  const id = String(itemId ?? '').trim();
  const s = ledger.get(id);
  if (!s) throw new Error(`物资不存在：${id || '(空编码)'}`);
  return s;
}

// ---------------------------------------------------------------------------
// 纯函数：入库 / 出库 / 预警
// ---------------------------------------------------------------------------

/**
 * 物资入库（医院运营管理）。
 * @param itemId   物资编码（目录内）
 * @param quantity 入库数量（正整数）
 * @param batchNo  批次号（可空；非空时更新当前批次）
 * @returns 更新后的库存快照
 */
export function recordSupplyIn(itemId: string, quantity: number, batchNo?: string | null): Stock {
  const s = requireItem(itemId);
  const qty = toPositiveInt(quantity, '入库数量');
  s.quantity += qty;
  const bn = batchNo == null ? '' : String(batchNo).trim();
  if (bn) s.batchNo = bn;
  s.updatedAt = nowIso();
  applyStatus(s);
  return snapshot(s);
}

/**
 * 物资出库（医院运营管理）。库存不足时抛错，绝不形成负库存（账实相符红线）。
 * @param itemId    物资编码
 * @param quantity  出库数量（正整数，不得超过在库存）
 * @param dept      领用科室（必填）
 * @param patientId 关联患者号（可空，办公用品出库通常为空）
 * @returns 更新后的库存快照
 */
export function recordSupplyOut(
  itemId: string,
  quantity: number,
  dept: string,
  patientId?: string | null,
): Stock {
  const s = requireItem(itemId);
  const qty = toPositiveInt(quantity, '出库数量');
  const d = String(dept ?? '').trim();
  if (!d) throw new Error('领用科室 dept 不能为空');
  if (s.quantity < qty) {
    throw new Error(
      `库存不足：${s.name} 当前在库 ${s.quantity}${s.unit}，无法出库 ${qty}${s.unit}（禁止负库存，保证账实相符）`,
    );
  }
  s.quantity -= qty;
  s.updatedAt = nowIso();
  applyStatus(s);
  // patientId 仅用于流水追溯，不改动库存结构
  void patientId;
  return snapshot(s);
}

/**
 * 低库存预警扫描：返回在库 < 安全库存 的物资。
 * 规则（确定性、可单测）：
 *  - 仅保留 quantity 严格小于 minStock 的行（== 阈值不预警）；
 *  - quantity <= 0 记为 out（缺货），否则记为 low（偏低）；
 *  - shortfall = minStock - quantity；
 *  - 排序：缺货(out)优先，其次按缺口 shortfall 降序。
 */
export function getLowStockAlerts(): Alert[] {
  const alerts: Alert[] = [];
  for (const s of ledger.values()) {
    if (s.quantity >= s.minStock) continue;
    const level: Alert['level'] = s.quantity <= 0 ? 'out' : 'low';
    alerts.push({
      itemId: s.itemId,
      name: s.name,
      category: s.category,
      unit: s.unit,
      quantity: s.quantity,
      minStock: s.minStock,
      shortfall: s.minStock - s.quantity,
      level,
      message:
        level === 'out'
          ? `【缺货】${s.name} 在库 0 ${s.unit}，请立即补货`
          : `【偏低】${s.name} 在库 ${s.quantity}${s.unit}，低于安全库存 ${s.minStock}${s.unit}`,
    });
  }
  alerts.sort((a, b) => {
    if (a.level !== b.level) return a.level === 'out' ? -1 : 1;
    return b.shortfall - a.shortfall;
  });
  return alerts;
}

/** 全量库存快照（GET 列表用），按物资编码排序 */
export function listStock(): Stock[] {
  return [...ledger.values()]
    .map(snapshot)
    .sort((a, b) => a.itemId.localeCompare(b.itemId));
}

/** 视图：库存列表 + 低库存预警（BFF 路由直接消费） */
export function supplyView(): { items: Stock[]; alerts: Alert[]; generatedAt: string } {
  return { items: listStock(), alerts: getLowStockAlerts(), generatedAt: nowIso() };
}
