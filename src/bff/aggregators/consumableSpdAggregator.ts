/**
 * 健澜科技 jlmedaios - M177-D 医院耗材管理深化——SPD 物流聚合器
 *
 * 【病案设备耗材】SPD（Supply Processing Distribution）医院供应链物流：
 *   采购：科室申请 + 采购订单 + 到货验收；
 *   库存：一级库（中心库房）+ 二级库（科室库房）+ 消耗点（手术室/治疗车）；
 *   使用：扫码领用 + 消耗记录 + HMS 计费；
 *   结算：按实际消耗（PPV, Pay-Per-View）与供应商结算，而非按入库量。
 *
 * 核心红线：高值耗材一物一码追溯，不能漏。
 *   高值件（冠脉支架/人工关节/起搏器/人工晶体…）必须挂 UDI + 唯一序列号，
 *   从供应商 → 一级库 → 二级库 → 消耗点 → 患者 → 计费 → 结算全程留痕；
 *   任何高值件缺码即被 identifyHighValueConsumables 显式判为「漏追溯」，
 *   不允许静默放行。
 *
 * 四个纯函数：
 *   - buildDeepConsumableMgmt()                     SPD 深度管理驾驶舱（采购/库存/使用/结算四段汇总）
 *   - optimizeConsumableInventory(items)            库存优化（补货点/呆滞/ABC/建议订货量）
 *   - trackConsumableConsumption(department, period) 科室耗材消耗跟踪（量/额/分类/趋势/计费闭环）
 *   - identifyHighValueConsumables(items)           高值耗材一物一码追溯（漏码即报警）
 *
 * 设计要点：
 *  - 全部纯函数：不读库、不发网络、不碰 WebSocket、不新增依赖，便于单测与前端复用；
 *  - 空库时用内置演示台账兜底（demo=true），生产环境由 359 SQL 表数据替换；
 *  - 高值阈值 unitPrice ≥ 1000 元（与医院高值耗材目录惯例一致）；
 *  - 患者位置只输出脱敏标识（P-xxxx），不落姓名/身份证，符合隐私合规。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------- 类型定义 ------------------------------- */

/** 耗材类别（与 clinical.supply_item.category 对齐） */
export type ConsumableCategory = 'disposable' | 'disinfect' | 'reagent' | 'office';

/** 价值等级：high 高值（一物一码）/ medium 中值 / low 低值 */
export type ValueLevel = 'high' | 'medium' | 'low';

/** 结算模式：consignment 寄售按实际消耗 PPV / direct 直购按采购 */
export type SettleMode = 'consignment' | 'direct';

/** 一条耗材台账（病案设备耗材域，与 clinical.supply_item 扩展列对齐） */
export interface ConsumableItem {
  /** 物资编码（业务唯一键） */
  itemCode: string;
  name: string;
  category: ConsumableCategory;
  unit: string;
  /** 单价（元），高值判定与 PPV 结算依据 */
  unitPrice: number;
  /** 在库总量（= level1 + level2 + point） */
  currentStock: number;
  /** 安全库存阈值 */
  safetyStock: number;
  /** 最高库存（超过即呆滞积压） */
  maxStock: number;
  /** 一级库（中心库房）在库 */
  level1Qty: number;
  /** 二级库（科室库房）在库 */
  level2Qty: number;
  /** 消耗点（手术室/治疗车）在库 */
  pointQty: number;
  valueLevel: ValueLevel;
  /** 是否一物一码追溯（高值必为 true） */
  isTraceable: boolean;
  /** 医疗器械唯一标识 UDI-DI */
  udiCode: string;
  /** 单品唯一序列号（一物一码；低值可空串） */
  serialNo: string;
  /** 供应商名称 */
  supplier: string;
  settleMode: SettleMode;
  /** HMS 计费对照码（扫码消耗即计费） */
  hmsBillingCode: string;
  batchNo: string;
  /** 效期（YYYY-MM-DD，试剂类，可空） */
  expiryDate: string | null;
  /** 月均消耗量（库存优化基线） */
  monthlyUsage: number;
}

/* --------------------------- 内置演示台账 --------------------------- */

/** 高值耗材单价阈值（元）：≥1000 元即纳入高值一物一码追溯 */
export const HIGH_VALUE_PRICE_THRESHOLD = 1000;

/**
 * 演示耗材台账（病案设备耗材域；纯函数内存数据，不读库）。
 * 覆盖高值/中值/低值、寄售/直购、三级库位；其中一件高值件（人工晶体）
 * 故意缺序列号，用于验证「漏追溯不被静默放行」。
 */
export const DEMO_CONSUMABLES: ConsumableItem[] = [
  {
    itemCode: 'DISP-OR-STENT', name: '冠脉药物支架', category: 'disposable', unit: '个',
    unitPrice: 8800, currentStock: 12, safetyStock: 6, maxStock: 20,
    level1Qty: 8, level2Qty: 3, pointQty: 1,
    valueLevel: 'high', isTraceable: true, udiCode: 'UDI-690123456001', serialNo: 'SN-ST-1001',
    supplier: '微创医疗', settleMode: 'consignment', hmsBillingCode: 'BILL-STENT-PCI',
    batchNo: 'B202609', expiryDate: '2028-09-30', monthlyUsage: 10,
  },
  {
    itemCode: 'DISP-OR-JOINT', name: '人工髋关节假体', category: 'disposable', unit: '套',
    unitPrice: 26000, currentStock: 4, safetyStock: 2, maxStock: 8,
    level1Qty: 3, level2Qty: 1, pointQty: 0,
    valueLevel: 'high', isTraceable: true, udiCode: 'UDI-690123456002', serialNo: 'SN-JO-2001',
    supplier: '施乐辉', settleMode: 'consignment', hmsBillingCode: 'BILL-JOINT-THR',
    batchNo: 'B202608', expiryDate: '2029-01-31', monthlyUsage: 3,
  },
  {
    itemCode: 'DISP-OR-PACEMAKER', name: '心脏起搏器(单腔)', category: 'disposable', unit: '台',
    unitPrice: 35000, currentStock: 2, safetyStock: 1, maxStock: 4,
    level1Qty: 1, level2Qty: 1, pointQty: 0,
    valueLevel: 'high', isTraceable: true, udiCode: 'UDI-690123456003', serialNo: 'SN-PM-3001',
    supplier: '美敦力', settleMode: 'consignment', hmsBillingCode: 'BILL-PM-PPM',
    batchNo: 'B202607', expiryDate: '2028-06-30', monthlyUsage: 2,
  },
  {
    // 【漏追溯样本】高值人工晶体：有 UDI、isTraceable=true，但缺 serialNo 序列号，
    //   identifyHighValueConsumables 必须将其判为 missingTrace（漏码报警），不能漏。
    itemCode: 'DISP-OR-LENS', name: '人工晶体(单焦)', category: 'disposable', unit: '片',
    unitPrice: 4500, currentStock: 6, safetyStock: 3, maxStock: 10,
    level1Qty: 4, level2Qty: 2, pointQty: 0,
    valueLevel: 'high', isTraceable: true, udiCode: 'UDI-690123456004', serialNo: '',
    supplier: '爱尔康', settleMode: 'consignment', hmsBillingCode: 'BILL-LENS-IOL',
    batchNo: 'B202609', expiryDate: '2028-12-31', monthlyUsage: 5,
  },
  {
    itemCode: 'DISP-CATHETER', name: '中心静脉导管', category: 'disposable', unit: '套',
    unitPrice: 650, currentStock: 30, safetyStock: 15, maxStock: 60,
    level1Qty: 20, level2Qty: 8, pointQty: 2,
    valueLevel: 'medium', isTraceable: false, udiCode: '', serialNo: '',
    supplier: '爱德华', settleMode: 'direct', hmsBillingCode: 'BILL-CVC',
    batchNo: 'B202610', expiryDate: '2027-10-31', monthlyUsage: 24,
  },
  {
    itemCode: 'DISP-SUTURE', name: '可吸收缝合线', category: 'disposable', unit: '包',
    unitPrice: 180, currentStock: 80, safetyStock: 40, maxStock: 120,
    level1Qty: 50, level2Qty: 25, pointQty: 5,
    valueLevel: 'medium', isTraceable: false, udiCode: '', serialNo: '',
    supplier: '强生医疗', settleMode: 'direct', hmsBillingCode: 'BILL-SUTURE',
    batchNo: 'B202610', expiryDate: '2027-08-31', monthlyUsage: 60,
  },
  {
    // 【呆滞样本】当前库存 200 > maxStock 120，且月耗仅 4 → optimize 判 reduce
    itemCode: 'DISP-SCALPEL', name: '手术刀片', category: 'disposable', unit: '片',
    unitPrice: 3.5, currentStock: 200, safetyStock: 30, maxStock: 120,
    level1Qty: 150, level2Qty: 40, pointQty: 10,
    valueLevel: 'low', isTraceable: false, udiCode: '', serialNo: '',
    supplier: '金环医疗', settleMode: 'direct', hmsBillingCode: '',
    batchNo: 'B202605', expiryDate: '2027-05-31', monthlyUsage: 4,
  },
  {
    // 【缺断样本】当前库存 5 <= safetyStock 10 → optimize 判紧急 replenish
    itemCode: 'DISP-SYRINGE', name: '一次性注射器(5ml)', category: 'disposable', unit: '支',
    unitPrice: 1.2, currentStock: 5, safetyStock: 10, maxStock: 200,
    level1Qty: 2, level2Qty: 2, pointQty: 1,
    valueLevel: 'low', isTraceable: false, udiCode: '', serialNo: '',
    supplier: '康德莱', settleMode: 'direct', hmsBillingCode: '',
    batchNo: 'B202610', expiryDate: '2027-10-31', monthlyUsage: 300,
  },
  {
    itemCode: 'DISP-GLOVES', name: '无菌橡胶手套', category: 'disposable', unit: '副',
    unitPrice: 0.8, currentStock: 500, safetyStock: 200, maxStock: 800,
    level1Qty: 300, level2Qty: 150, pointQty: 50,
    valueLevel: 'low', isTraceable: false, udiCode: '', serialNo: '',
    supplier: '英科医疗', settleMode: 'direct', hmsBillingCode: '',
    batchNo: 'B202610', expiryDate: '2027-10-31', monthlyUsage: 900,
  },
  {
    itemCode: 'REAG-ELISA', name: 'ELISA 检验试剂盒', category: 'reagent', unit: '盒',
    unitPrice: 420, currentStock: 18, safetyStock: 6, maxStock: 30,
    level1Qty: 18, level2Qty: 0, pointQty: 0,
    valueLevel: 'medium', isTraceable: false, udiCode: '', serialNo: '',
    supplier: '罗氏诊断', settleMode: 'consignment', hmsBillingCode: '',
    batchNo: 'B202610', expiryDate: '2026-12-31', monthlyUsage: 10,
  },
];

/* ========================= identifyHighValueConsumables ========================= */

/** 漏追溯缺口项（一件高值件缺了哪个追溯要素） */
export interface HighValueTraceGap {
  itemCode: string;
  name: string;
  unitPrice: number;
  supplier: string;
  /** 缺失的追溯要素：udi 缺 UDI / serial 缺一物一码序列号 / flag 未开启追溯标记 */
  missing: ('udi' | 'serial' | 'flag')[];
  /** 漏码原因说明 */
  reason: string;
}

/** 一件高值耗材的闭环追溯链（病案设备耗材域） */
export interface HighValueTraceChain {
  itemCode: string;
  name: string;
  serialNo: string;
  udiCode: string;
  supplier: string;
  unitPrice: number;
  /** 闭环环节：采购→到货→一级库→二级库→消耗点→使用→计费→结算 */
  stages: { key: string; label: string; done: boolean }[];
  patientRef: string;
}

/** identifyHighValueConsumables 产出 */
export interface HighValueTraceResult {
  /** 高值件总数（valueLevel=high 或单价≥阈值） */
  highValueCount: number;
  /** 完整一物一码追溯的件数 */
  fullyTracedCount: number;
  /** 漏追溯件（缺 UDI / 缺序列号 / 未开追溯标记）——「不能漏」的报警清单 */
  missingTrace: HighValueTraceGap[];
  /** 完整追溯链样本（前端画闭环） */
  traceChains: HighValueTraceChain[];
  /** 一物一码追溯率（%，0..100，保留 1 位小数） */
  traceRate: number;
  /** 是否存在漏追溯（true = 有高值件未闭环，必须整改） */
  hasGap: boolean;
  conclusion: string;
}

/** 判断某耗材是否为高值件（显式标记 或 单价≥阈值） */
export function isHighValueItem(it: ConsumableItem): boolean {
  return it.valueLevel === 'high' || it.unitPrice >= HIGH_VALUE_PRICE_THRESHOLD;
}

/**
 * identifyHighValueConsumables：高值耗材一物一码追溯。
 *
 * 高值件必须三要素齐全：isTraceable=true + udiCode 非空 + serialNo 非空。
 * 任一缺失即判为「漏追溯」（missingTrace），绝不静默放行——这是「不能漏」的硬约束。
 *
 * @param items 耗材台账（不传则用内置演示台账）
 * @returns     HighValueTraceResult（总数/已追溯/漏码清单/闭环链/追溯率/结论）
 *
 * 纯函数：相同入参必得相同出参。
 */
export function identifyHighValueConsumables(
  items: ConsumableItem[] = DEMO_CONSUMABLES,
): HighValueTraceResult {
  const highValue = items.filter(isHighValueItem);

  const missingTrace: HighValueTraceGap[] = [];
  const traceChains: HighValueTraceChain[] = [];
  let fullyTraced = 0;

  for (const it of highValue) {
    const gaps: ('udi' | 'serial' | 'flag')[] = [];
    if (!it.isTraceable) gaps.push('flag');
    if (!it.udiCode) gaps.push('udi');
    if (!it.serialNo) gaps.push('serial');

    if (gaps.length > 0) {
      const missingReason = gaps
        .map((g) =>
          g === 'udi' ? '缺 UDI 编码' : g === 'serial' ? '缺一物一码序列号' : '未开启追溯标记',
        )
        .join('、');
      missingTrace.push({
        itemCode: it.itemCode,
        name: it.name,
        unitPrice: it.unitPrice,
        supplier: it.supplier,
        missing: gaps,
        reason: `高值耗材未闭环追溯：${missingReason}，禁止出库，须补码后放行。`,
      });
      continue;
    }

    fullyTraced++;
    // 完整闭环链（8 段；已在库的高值件默认走完前 5 段，使用/计费/结算按样例推导）
    traceChains.push({
      itemCode: it.itemCode,
      name: it.name,
      serialNo: it.serialNo,
      udiCode: it.udiCode,
      supplier: it.supplier,
      unitPrice: it.unitPrice,
      stages: [
        { key: 'purchased', label: '采购订单', done: true },
        { key: 'arrived', label: '到货验收', done: true },
        { key: 'level1', label: '一级库入库', done: it.level1Qty > 0 },
        { key: 'level2', label: '二级库调拨', done: it.level2Qty > 0 },
        { key: 'point', label: '消耗点上架', done: it.pointQty > 0 },
        { key: 'used', label: '扫码使用', done: false },
        { key: 'billed', label: 'HMS 计费', done: false },
        { key: 'settled', label: '供应商结算', done: false },
      ],
      patientRef: '',
    });
  }

  const traceRate =
    highValue.length === 0
      ? 100
      : Math.round((fullyTraced / highValue.length) * 1000) / 10;

  const hasGap = missingTrace.length > 0;
  const conclusion =
    highValue.length === 0
      ? '暂无高值耗材目录。'
      : hasGap
        ? `高值耗材一物一码追溯率 ${traceRate}%，${missingTrace.length} 件漏追溯（缺码未闭环），禁止出库，须立即补 UDI/序列号。`
        : `高值耗材一物一码追溯率 ${traceRate}%，全部高值件 UDI+序列号闭环，可追溯到患者。`;

  return {
    highValueCount: highValue.length,
    fullyTracedCount: fullyTraced,
    missingTrace,
    traceChains,
    traceRate,
    hasGap,
    conclusion,
  };
}

/* ========================= optimizeConsumableInventory ========================= */

/** 单件耗材的库存优化建议 */
export interface InventoryOptimizationItem {
  itemCode: string;
  name: string;
  category: ConsumableCategory;
  currentStock: number;
  safetyStock: number;
  maxStock: number;
  monthlyUsage: number;
  /** 建议再订货点（安全库存 + 提前期需求，提前期按 7 天） */
  reorderPoint: number;
  /** 建议订货量（补到 maxStock 的 60% 水位） */
  suggestedOrderQty: number;
  /** 当前库存可支撑天数（月耗为 0 时为 null） */
  stockDays: number | null;
  /** ABC 分类（按年耗用金额：A 重点管控 / B 常规 / C 零星） */
  abcClass: 'A' | 'B' | 'C';
  /** 处置动作：replenish 补货 / reduce 退库调拨 / monitor 观察 / ok 正常 */
  action: 'replenish' | 'reduce' | 'monitor' | 'ok';
  /** 动作说明 */
  reason: string;
}

/** optimizeConsumableInventory 产出 */
export interface InventoryOptimizationResult {
  items: InventoryOptimizationItem[];
  summary: {
    total: number;
    replenishCount: number;
    reduceCount: number;
    monitorCount: number;
    okCount: number;
    /** 建议补货占用资金（元，按单价） */
    replenishValue: number;
    /** 呆滞积压资金（元，超 maxStock 部分 × 单价） */
    excessValue: number;
    conclusion: string;
  };
}

/** 采购提前期（天） */
const LEAD_TIME_DAYS = 7;

/** ABC 年耗用金额分级阈值（元/年） */
const ABC_A_VALUE = 100000;
const ABC_B_VALUE = 20000;

/**
 * optimizeConsumableInventory：耗材库存优化。
 *
 * 规则（病案设备耗材域）：
 *   - 再订货点 = 安全库存 + 提前期需求（月耗/30 × 7）；
 *   - 当前库存 ≤ 安全库存 → replenish（紧急补货）；
 *   - 当前库存 > 最高库存 → reduce（呆滞积压，建议退库/科室间调拨）；
 *   - 月耗为 0 但有库存 → monitor（零消耗呆滞观察）；
 *   - 其余 → ok；
 *   - ABC 按年耗用金额（月耗×12×单价）分级，A 类重点管控。
 *
 * @param items 耗材台账（不传则用内置演示台账）
 * @returns     InventoryOptimizationResult（逐件建议 + 汇总）
 *
 * 纯函数：相同入参必得相同出参。
 */
export function optimizeConsumableInventory(
  items: ConsumableItem[] = DEMO_CONSUMABLES,
): InventoryOptimizationResult {
  const out: InventoryOptimizationItem[] = items.map((it) => {
    const daily = it.monthlyUsage / 30;
    const reorderPoint = it.safetyStock + Math.ceil(daily * LEAD_TIME_DAYS);
    const stockDays = it.monthlyUsage > 0 ? Math.round((it.currentStock / daily) * 10) / 10 : null;

    const annualValue = it.monthlyUsage * 12 * it.unitPrice;
    const abcClass: 'A' | 'B' | 'C' =
      annualValue >= ABC_A_VALUE ? 'A' : annualValue >= ABC_B_VALUE ? 'B' : 'C';

    let action: InventoryOptimizationItem['action'];
    let reason: string;
    if (it.currentStock <= it.safetyStock) {
      action = 'replenish';
      reason = `库存 ${it.currentStock} ≤ 安全库存 ${it.safetyStock}，紧急补货。`;
    } else if (it.currentStock > it.maxStock) {
      action = 'reduce';
      reason = `库存 ${it.currentStock} > 最高库存 ${it.maxStock}，呆滞积压，建议退库/科室调拨。`;
    } else if (it.monthlyUsage === 0 && it.currentStock > 0) {
      action = 'monitor';
      reason = '月耗为 0 但有库存，零消耗呆滞，观察效期后处理。';
    } else {
      action = 'ok';
      reason = `库存健康，可支撑 ${stockDays ?? '∞'} 天。`;
    }

    const suggestedOrderQty =
      action === 'replenish' ? Math.max(0, Math.round((it.maxStock - it.currentStock) * 0.6)) : 0;

    return {
      itemCode: it.itemCode,
      name: it.name,
      category: it.category,
      currentStock: it.currentStock,
      safetyStock: it.safetyStock,
      maxStock: it.maxStock,
      monthlyUsage: it.monthlyUsage,
      reorderPoint,
      suggestedOrderQty,
      stockDays,
      abcClass,
      action,
      reason,
    };
  });

  const replenishItems = out.filter((o) => o.action === 'replenish');
  const reduceItems = out.filter((o) => o.action === 'reduce');
  const monitorItems = out.filter((o) => o.action === 'monitor');
  const okItems = out.filter((o) => o.action === 'ok');

  const byCode = new Map(items.map((it) => [it.itemCode, it]));
  let replenishValue = 0;
  let excessValue = 0;
  for (const o of replenishItems) {
    replenishValue += o.suggestedOrderQty * (byCode.get(o.itemCode)?.unitPrice ?? 0);
  }
  for (const o of reduceItems) {
    const over = o.currentStock - o.maxStock;
    excessValue += over * (byCode.get(o.itemCode)?.unitPrice ?? 0);
  }
  replenishValue = Math.round(replenishValue * 100) / 100;
  excessValue = Math.round(excessValue * 100) / 100;

  const conclusion =
    `共 ${out.length} 类耗材：建议补货 ${replenishItems.length} 类（约 ${replenishValue.toLocaleString()} 元）、` +
    `呆滞退库 ${reduceItems.length} 类（压占 ${excessValue.toLocaleString()} 元）、` +
    `观察 ${monitorItems.length} 类、健康 ${okItems.length} 类。`;

  return {
    items: out,
    summary: {
      total: out.length,
      replenishCount: replenishItems.length,
      reduceCount: reduceItems.length,
      monitorCount: monitorItems.length,
      okCount: okItems.length,
      replenishValue,
      excessValue,
      conclusion,
    },
  };
}

/* ========================= trackConsumableConsumption ========================= */

export type ConsumptionPeriod = 'week' | 'month' | 'quarter';

/** 单条消耗事件（确定性演示台账） */
interface ConsumptionEvent {
  department: string;
  itemCode: string;
  qty: number;
  unitPrice: number;
  isHighValue: boolean;
  hasBillingCode: boolean;
  /** 落在哪个子周期（week: 0..6 天；month: 0..3 旬；quarter: 0..2 月） */
  bucket: number;
}

/** 演示消耗事件台账（病案设备耗材域；纯函数内存数据，确定性可复算） */
const CONSUMPTION_EVENTS: ConsumptionEvent[] = [
  // 手术麻醉科：高值为主（支架/关节/起搏器/晶体）
  { department: 'or', itemCode: 'DISP-OR-STENT', qty: 8, unitPrice: 8800, isHighValue: true, hasBillingCode: true, bucket: 1 },
  { department: 'or', itemCode: 'DISP-OR-JOINT', qty: 3, unitPrice: 26000, isHighValue: true, hasBillingCode: true, bucket: 2 },
  { department: 'or', itemCode: 'DISP-OR-PACEMAKER', qty: 2, unitPrice: 35000, isHighValue: true, hasBillingCode: true, bucket: 0 },
  { department: 'or', itemCode: 'DISP-OR-LENS', qty: 5, unitPrice: 4500, isHighValue: true, hasBillingCode: true, bucket: 2 },
  { department: 'or', itemCode: 'DISP-SUTURE', qty: 40, unitPrice: 180, isHighValue: false, hasBillingCode: true, bucket: 1 },
  { department: 'or', itemCode: 'DISP-SCALPEL', qty: 6, unitPrice: 3.5, isHighValue: false, hasBillingCode: false, bucket: 0 },
  // 骨科
  { department: 'orthopedics', itemCode: 'DISP-OR-JOINT', qty: 2, unitPrice: 26000, isHighValue: true, hasBillingCode: true, bucket: 2 },
  { department: 'orthopedics', itemCode: 'DISP-CATHETER', qty: 10, unitPrice: 650, isHighValue: false, hasBillingCode: true, bucket: 1 },
  { department: 'orthopedics', itemCode: 'DISP-SUTURE', qty: 25, unitPrice: 180, isHighValue: false, hasBillingCode: true, bucket: 2 },
  // 心血管内科
  { department: 'cardiology', itemCode: 'DISP-OR-STENT', qty: 5, unitPrice: 8800, isHighValue: true, hasBillingCode: true, bucket: 1 },
  { department: 'cardiology', itemCode: 'DISP-CATHETER', qty: 14, unitPrice: 650, isHighValue: false, hasBillingCode: true, bucket: 0 },
  { department: 'cardiology', itemCode: 'DISP-SYRINGE', qty: 200, unitPrice: 1.2, isHighValue: false, hasBillingCode: false, bucket: 2 },
  // 普外科
  { department: 'surgery', itemCode: 'DISP-GLOVES', qty: 300, unitPrice: 0.8, isHighValue: false, hasBillingCode: false, bucket: 1 },
  { department: 'surgery', itemCode: 'DISP-SUTURE', qty: 35, unitPrice: 180, isHighValue: false, hasBillingCode: true, bucket: 2 },
  { department: 'surgery', itemCode: 'DISP-SCALPEL', qty: 4, unitPrice: 3.5, isHighValue: false, hasBillingCode: false, bucket: 0 },
  // 检验科（试剂）
  { department: 'lab', itemCode: 'REAG-ELISA', qty: 9, unitPrice: 420, isHighValue: false, hasBillingCode: false, bucket: 1 },
];

const DEPT_NAME: Record<string, string> = {
  or: '手术麻醉科',
  orthopedics: '骨科',
  cardiology: '心血管内科',
  surgery: '普外科',
  lab: '检验科',
};

const PERIOD_BUCKETS: Record<ConsumptionPeriod, { count: number; label: string }> = {
  week: { count: 7, label: '日' },
  month: { count: 3, label: '旬' },
  quarter: { count: 3, label: '月' },
};

/** 科室消耗跟踪产出 */
export interface DepartmentConsumption {
  department: string;
  departmentName: string;
  period: ConsumptionPeriod;
  /** 消耗总件数 */
  totalQty: number;
  /** 消耗总金额（元） */
  totalCost: number;
  /** 高值耗材消耗件数（一物一码） */
  highValueQty: number;
  /** 已与 HMS 计费勾稽的件数（计费闭环） */
  billedQty: number;
  /** 计费闭环率（%） */
  billingMatchRate: number;
  /** 按类别拆分金额 */
  byCategory: { category: ConsumableCategory; qty: number; cost: number }[];
  /** 消耗 TOP 耗材（按金额降序） */
  topItems: { itemCode: string; name: string; qty: number; cost: number; isHighValue: boolean }[];
  /** 子周期趋势（量） */
  trend: { bucket: number; label: string; qty: number; cost: number }[];
  conclusion: string;
}

/**
 * trackConsumableConsumption：科室耗材消耗跟踪。
 *
 * @param department 科室编号（or/orthopedics/cardiology/surgery/lab；未知回退全院汇总）
 * @param period     week / month / quarter（子周期分桶粒度）
 * @returns          DepartmentConsumption（量/额/分类/TOP/趋势/计费闭环）
 *
 * 纯函数：相同入参必得相同出参；消耗事件为内置确定性台账。
 */
export function trackConsumableConsumption(
  department: string = 'or',
  period: ConsumptionPeriod = 'month',
): DepartmentConsumption {
  const known = DEPT_NAME[department] !== undefined;
  const events = known
    ? CONSUMPTION_EVENTS.filter((e) => e.department === department)
    : CONSUMPTION_EVENTS; // 未知科室 → 全院汇总

  const meta = PERIOD_BUCKETS[period] ?? PERIOD_BUCKETS.month;
  const itemName = new Map(DEMO_CONSUMABLES.map((it) => [it.itemCode, it.name]));
  const itemCategory = new Map<string, ConsumableCategory>(
    DEMO_CONSUMABLES.map((it) => [it.itemCode, it.category]),
  );

  let totalQty = 0;
  let totalCost = 0;
  let highValueQty = 0;
  let billedQty = 0;
  const catMap = new Map<string, { qty: number; cost: number }>();
  const itemMap = new Map<string, { qty: number; cost: number; isHighValue: boolean }>();
  const trendBuckets = Array.from({ length: meta.count }, () => ({ qty: 0, cost: 0 }));

  for (const e of events) {
    const cost = e.qty * e.unitPrice;
    totalQty += e.qty;
    totalCost += cost;
    if (e.isHighValue) highValueQty += e.qty;
    if (e.hasBillingCode) billedQty += e.qty;

    const cat = itemCategory.get(e.itemCode) ?? 'disposable';
    const c = catMap.get(cat) ?? { qty: 0, cost: 0 };
    c.qty += e.qty;
    c.cost += cost;
    catMap.set(cat, c);

    const im = itemMap.get(e.itemCode) ?? { qty: 0, cost: 0, isHighValue: e.isHighValue };
    im.qty += e.qty;
    im.cost += cost;
    itemMap.set(e.itemCode, im);

    const b = Math.min(e.bucket, meta.count - 1);
    trendBuckets[b].qty += e.qty;
    trendBuckets[b].cost += cost;
  }

  totalCost = Math.round(totalCost * 100) / 100;
  const billingMatchRate =
    totalQty === 0 ? 0 : Math.round((billedQty / totalQty) * 1000) / 10;

  const byCategory = [...catMap.entries()]
    .map(([category, v]) => ({
      category: category as ConsumableCategory,
      qty: v.qty,
      cost: Math.round(v.cost * 100) / 100,
    }))
    .sort((a, b) => b.cost - a.cost);

  const topItems = [...itemMap.entries()]
    .map(([itemCode, v]) => ({
      itemCode,
      name: itemName.get(itemCode) ?? itemCode,
      qty: v.qty,
      cost: Math.round(v.cost * 100) / 100,
      isHighValue: v.isHighValue,
    }))
    .sort((a, b) => b.cost - a.cost)
    .slice(0, 5);

  const trend = trendBuckets.map((v, i) => ({
    bucket: i,
    label: `${i + 1}${meta.label}`,
    qty: v.qty,
    cost: Math.round(v.cost * 100) / 100,
  }));

  const deptLabel = known ? DEPT_NAME[department] : '全院汇总';
  const conclusion =
    events.length === 0
      ? `${deptLabel}本周期无耗材消耗记录。`
      : `${deptLabel}${period === 'week' ? '本周' : period === 'month' ? '本月' : '本季度'}消耗 ` +
        `${totalQty} 件 / ${totalCost.toLocaleString()} 元，其中高值一物一码 ${highValueQty} 件，` +
        `HMS 计费闭环率 ${billingMatchRate}%。`;

  return {
    department: known ? department : 'all',
    departmentName: deptLabel,
    period,
    totalQty,
    totalCost,
    highValueQty,
    billedQty,
    billingMatchRate,
    byCategory,
    topItems,
    trend,
    conclusion,
  };
}

/* ========================= buildDeepConsumableMgmt ========================= */

/** buildDeepConsumableMgmt 产出：SPD 深度管理驾驶舱 */
export interface DeepConsumableMgmt {
  /** 病案设备耗材 · SPD 物流 */
  mode: 'SPD';
  /** 采购段：科室申请 / 采购订单 / 到货验收 */
  procurement: {
    departmentRequests: { dept: string; deptName: string; pendingItems: number; note: string }[];
    purchaseOrders: { orderNo: string; supplier: string; itemCount: number; amount: number; status: string }[];
    arrivals: { goodsNo: string; supplier: string; sku: number; accepted: boolean; note: string }[];
  };
  /** 库存段：一级库 + 二级库 + 消耗点 */
  inventory: {
    level1Total: number;
    level2Total: number;
    pointTotal: number;
    total: number;
    byLocation: { location: string; label: string; qty: number; value: number }[];
  };
  /** 使用段：扫码领用 / 消耗记录 / HMS 计费 */
  usage: {
    scanPickupCount: number;
    consumptionRecordCount: number;
    billingMatchedRate: number;
  };
  /** 结算段：按实际消耗 PPV 与供应商结算 */
  settlement: {
    /** 实际消耗金额（元） */
    actualConsumptionValue: number;
    /** 寄售(PPV)应结供应商金额（元） */
    consignmentSettleValue: number;
    /** 直购金额（元，入库即结，不随消耗） */
    directPurchaseValue: number;
  };
  /** 高值一物一码追溯（组合 identifyHighValueConsumables） */
  highValue: ReturnType<typeof identifyHighValueConsumables>;
  /** 库存优化建议（组合 optimizeConsumableInventory） */
  optimization: ReturnType<typeof optimizeConsumableInventory>;
  demo: boolean;
  generatedAt: string;
}

/**
 * buildDeepConsumableMgmt：SPD 深度耗材管理驾驶舱。
 *
 * 串联四段闭环：采购 → 三级库存 → 扫码使用/计费 → PPV 结算，
 * 并组合高值追溯与库存优化两个纯函数，一页看全局。
 *
 * 纯函数：相同入参必得相同布局（generatedAt 为调用时刻，不参与业务逻辑）。
 */
export function buildDeepConsumableMgmt(): DeepConsumableMgmt {
  const highValue = identifyHighValueConsumables(DEMO_CONSUMABLES);
  const optimization = optimizeConsumableInventory(DEMO_CONSUMABLES);

  // 库存段：三级库位汇总
  const level1Total = DEMO_CONSUMABLES.reduce((s, it) => s + it.level1Qty, 0);
  const level2Total = DEMO_CONSUMABLES.reduce((s, it) => s + it.level2Qty, 0);
  const pointTotal = DEMO_CONSUMABLES.reduce((s, it) => s + it.pointQty, 0);
  const valueOf = (pick: (it: ConsumableItem) => number) =>
    Math.round(DEMO_CONSUMABLES.reduce((s, it) => s + pick(it) * it.unitPrice, 0) * 100) / 100;

  // 采购段（确定性演示）
  const procurement = {
    departmentRequests: [
      { dept: 'or', deptName: '手术麻醉科', pendingItems: 3, note: '高值支架/关节补货申请待审批' },
      { dept: 'cardiology', deptName: '心血管内科', pendingItems: 1, note: '注射器缺断，紧急请领' },
    ],
    purchaseOrders: [
      { orderNo: 'PO-202610-001', supplier: '微创医疗', itemCount: 12, amount: 105600, status: '已到货待验' },
      { orderNo: 'PO-202610-002', supplier: '施乐辉', itemCount: 4, amount: 104000, status: '在途' },
    ],
    arrivals: [
      { goodsNo: 'GR-202610-009', supplier: '微创医疗', sku: 12, accepted: true, note: 'UDI 全量核验通过' },
      { goodsNo: 'GR-202610-010', supplier: '爱尔康', sku: 6, accepted: false, note: '1 件缺序列号，暂缓入库待补码' },
    ],
  };

  // 使用段：以手术麻醉科本月消耗为代表
  const orConsumption = trackConsumableConsumption('or', 'month');

  // 结算段：寄售按实际消耗，直购按采购在库
  const consignmentItems = DEMO_CONSUMABLES.filter((it) => it.settleMode === 'consignment');
  const directItems = DEMO_CONSUMABLES.filter((it) => it.settleMode === 'direct');
  const consignmentSettleValue = valueOf((it) =>
    consignmentItems.includes(it) ? it.monthlyUsage : 0,
  );
  const directPurchaseValue = valueOf((it) => (directItems.includes(it) ? it.currentStock : 0));

  return {
    mode: 'SPD',
    procurement,
    inventory: {
      level1Total,
      level2Total,
      pointTotal,
      total: level1Total + level2Total + pointTotal,
      byLocation: [
        { location: 'level1', label: '一级库（中心库房）', qty: level1Total, value: valueOf((it) => it.level1Qty) },
        { location: 'level2', label: '二级库（科室库房）', qty: level2Total, value: valueOf((it) => it.level2Qty) },
        { location: 'point', label: '消耗点（手术室/治疗车）', qty: pointTotal, value: valueOf((it) => it.pointQty) },
      ],
    },
    usage: {
      scanPickupCount: orConsumption.totalQty,
      consumptionRecordCount: orConsumption.totalQty,
      billingMatchedRate: orConsumption.billingMatchRate,
    },
    settlement: {
      actualConsumptionValue: orConsumption.totalCost,
      consignmentSettleValue,
      directPurchaseValue,
    },
    highValue,
    optimization,
    demo: true,
    generatedAt: new Date().toISOString(),
  };
}
