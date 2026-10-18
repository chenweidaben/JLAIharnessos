/**
 * 健澜科技 jlmedaios - 病历库房盘点 V14 单测（M541-D，M541 收官）
 *
 * 测试 buildWarehouseCheck 构建库房盘点、stocktakeWarehouse 库房盘点、buildWarehouseCheckReport 构建盘点报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildWarehouseCheck,
  buildWarehouseCheckReport,
  stocktakeWarehouse,
  type WarehouseCheckInputV14,
} from "../../src/bff/aggregators/emrWarehouseCheckV14Aggregator";
import { emrWarehouseCheckV14Routes } from "../../src/bff/routes/emrWarehouseCheckV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildWarehouseCheck 构建库房盘点", () => {
  // 手算：warehouseName='病案库房A', checkDate='2026-10-18' → 正确构建
  it("warehouseName='病案库房A', checkDate='2026-10-18' → 正确构建", () => {
    const base = buildWarehouseCheck("病案库房A", "2026-10-18");
    expect(base.warehouseName).toBe("病案库房A");
    expect(base.checkDate).toBe("2026-10-18");
  });
});

describe("stocktakeWarehouse 相符", () => {
  // 手算：{expectedCount=1000, actualCount=1000}
  // 手算：diff = 1000 - 1000 = 0
  // 手算：status = diff===0 ? '账实相符' : ... → '账实相符'
  it("{expectedCount=1000, actualCount=1000} → diff=0, status='账实相符'", () => {
    const input: WarehouseCheckInputV14 = { expectedCount: 1000, actualCount: 1000 };
    const result = stocktakeWarehouse(input);
    expect(result.diff).toBe(0);
    expect(result.status).toBe("账实相符");
  });
});

describe("stocktakeWarehouse 轻微差异", () => {
  // 手算：{expectedCount=1000, actualCount=997}
  // 手算：diff = 997 - 1000 = -3
  // 手算：status = diff!==0, |−3|=3<=5 → '轻微差异'
  it("{expectedCount=1000, actualCount=997} → diff=-3, status='轻微差异'", () => {
    const input: WarehouseCheckInputV14 = { expectedCount: 1000, actualCount: 997 };
    const result = stocktakeWarehouse(input);
    expect(result.diff).toBe(-3);
    expect(result.status).toBe("轻微差异");
  });
});

describe("buildWarehouseCheckReport 构建盘点报告", () => {
  // 手算：{diff=0, status='账实相符'}
  // 手算：透传 diff + status
  it("{diff=0, status='账实相符'} → 正确返回（透传）", () => {
    const report = buildWarehouseCheckReport({ diff: 0, status: "账实相符" });
    expect(report.diff).toBe(0);
    expect(report.status).toBe("账实相符");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-warehouse-check auth:true", () => {
    const def = (emrWarehouseCheckV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-warehouse-check");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
