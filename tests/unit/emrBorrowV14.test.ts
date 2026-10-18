/**
 * 健澜科技 jlmedaios - 病历借阅复印管理 V14 单测（M462-C）
 *
 * 测试 canBorrow available→true、borrowed→false+reason、computeReturnDueDate 2026-10-18+7天=2026-10-25、默认 borrowDays=7、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  canBorrow,
  computeReturnDueDate,
  type BorrowRecordV14,
} from "../../src/bff/aggregators/emrBorrowV14Aggregator";
import { emrBorrowV14Routes } from "../../src/bff/routes/emrBorrowV14";
import type { RouteDef } from "../../src/bff/types";

const availableRecord: BorrowRecordV14 = {
  id: "B001",
  patientName: "张三",
  medicalRecordNumber: "ZY20261001001",
  status: "available",
};

describe("canBorrow available", () => {
  it("available 状态 → borrowable=true", () => {
    const result = canBorrow(availableRecord);
    expect(result.borrowable).toBe(true);
    expect(result.reason).toBeUndefined();
  });
});

describe("canBorrow borrowed", () => {
  // 手算：已借出 → borrowable=false，reason 提示"已借出，不可重复借阅"
  it("已 borrowed 状态 → borrowable=false，reason 提示", () => {
    const borrowedRecord: BorrowRecordV14 = { ...availableRecord, status: "borrowed" };
    const result = canBorrow(borrowedRecord);
    expect(result.borrowable).toBe(false);
    expect(result.reason).toContain("已借出");
  });
});

describe("computeReturnDueDate 2026-10-18+7天", () => {
  // 手算：2026-10-18 + 7天 = 2026-10-25
  it("appliedAt=2026-10-18, borrowDays=7 → 2026-10-25", () => {
    const dueDate = computeReturnDueDate("2026-10-18T00:00:00Z", 7);
    expect(dueDate).toContain("2026-10-25");
  });
});

describe("computeReturnDueDate 默认 borrowDays=7", () => {
  it("默认 borrowDays=7 → 10月18日+7天=10月25日", () => {
    const dueDate = computeReturnDueDate("2026-10-18T00:00:00Z");
    expect(dueDate).toContain("2026-10-25");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-borrow auth:true", () => {
    const def = (emrBorrowV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-borrow");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
