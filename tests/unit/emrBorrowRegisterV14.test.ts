/**
 * 健澜科技 jlmedaios - 病历借阅登记 V14 单测（M482-B）
 *
 * 测试 buildBorrowRecord 构建、checkOverdueReturn 超期检查、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBorrowRecord,
  checkOverdueReturn,
  type BorrowRecordV14,
} from "../../src/bff/aggregators/emrBorrowRegisterV14Aggregator";
import { emrBorrowRegisterV14Routes } from "../../src/bff/routes/emrBorrowRegisterV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildBorrowRecord 构建", () => {
  // 手算：medicalRecordId='MR001', borrower='李医生', borrowDays=5 → 正确构建
  it("medicalRecordId=MR001, borrower=李医生, borrowDays=5 → 正确构建", () => {
    const record: BorrowRecordV14 = buildBorrowRecord("MR001", "李医生", 5);
    expect(record.medicalRecordId).toBe("MR001");
    expect(record.borrower).toBe("李医生");
    expect(record.borrowDays).toBe(5);
  });
});

describe("checkOverdueReturn 边界", () => {
  // 手算：borrowDays=7, maxDays=7 → 7<=7 → overdue=false
  it("borrowDays=7, maxDays=7 → overdue=false", () => {
    const result = checkOverdueReturn(7, 7);
    expect(result.overdue).toBe(false);
  });
});

describe("checkOverdueReturn 超期", () => {
  // 手算：borrowDays=10, maxDays=7 → 10>7 → overdue=true, overdueDays=10-7=3
  it("borrowDays=10, maxDays=7 → overdue=true, overdueDays=3", () => {
    const result = checkOverdueReturn(10, 7);
    expect(result.overdue).toBe(true);
    expect(result.overdueDays).toBe(3);
  });
});

describe("checkOverdueReturn 未超期", () => {
  // 手算：borrowDays=3, maxDays=7 → 3<=7 → overdue=false
  it("borrowDays=3, maxDays=7 → overdue=false", () => {
    const result = checkOverdueReturn(3, 7);
    expect(result.overdue).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-borrow-register auth:true", () => {
    const def = (emrBorrowRegisterV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-borrow-register");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
