/**
 * 健澜科技 jlmedaios - 药品库存预警 API
 *
 * 真实模式直连 BFF（baseURL 已含 /api/v1，此处路径不再重复前缀）。
 * BFF/数据库不可用时由 request 层显式抛错；无库存时 BFF 返回 demo:true 演示行。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';

/** 一条药品库存记录 */
export interface DrugStockItem {
  id: string;
  /** 药品编码 */
  drugCode: string;
  /** 药品通用名 */
  drugName: string;
  /** 药房/库房 */
  warehouse: string;
  /** 批号（可空） */
  batchNo: string | null;
  /** 当前库存数量 */
  quantity: number;
  /** 计量单位 */
  unit: string;
  /** 效期（YYYY-MM-DD，可空） */
  expiryDate: string | null;
}

/** 低库存预警行（含建议采购量） */
export interface LowStockAlertItem extends DrugStockItem {
  /** 触发预警的库存阈值 */
  threshold: number;
  /** 缺口 = 阈值 - 当前库存 */
  shortfall: number;
  /** 建议采购量（补至两倍安全库存） */
  suggestedPurchaseQty: number;
}

/** 库存列表 + 预警视图 */
export interface DrugInventoryView {
  threshold: number;
  total: number;
  lowCount: number;
  /** true = 演示数据（无真实库存降级） */
  demo: boolean;
  items: DrugStockItem[];
  alerts: LowStockAlertItem[];
  scannedAt: string;
}

/** 库存列表 + 低库存预警（threshold 可空，BFF 用默认阈值） */
export function getDrugInventory(threshold?: number): Promise<DrugInventoryView> {
  return get<DrugInventoryView>('/drug-inventory', threshold ? { threshold } : undefined);
}
