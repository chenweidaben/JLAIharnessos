/**
 * 健澜科技 jlmedaios - 病历借阅登记管理 V14 单测（M540-B）
 *
 * 测试 buildBorrowRecord 构建借阅登记、registerBorrow 借阅登记、buildBorrowRecordReport 构建登记报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildBorrowRecord,
  buildBorrowRecordReport,
  registerBorrow,
  type BorrowRecordInputV14,
} from "../../src/bff/aggregators/emrBorrowRecordV14Aggregator";
import { emrBorrowRecordV14Routes } from "../../src/bff/routes/emrBorrowRecordV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildBorrowRecord 构建借阅登记", () => {
  // 手算：recordId='REC701', borrower='心内科王医生' → 正确构建
  it("recordId='REC701', borrower='心内科王医生' → 正确构建", () => {
    const base = buildBorrowRecord("REC701", "心内科王医生");
    expect(base.recordId).toBe("REC701");
    expect(base.borrower).toBe("心内科王医生");
  });
});

describe("registerBorrow 正常", () => {
  // 手算：{recordId='REC701', borrower='王医生', dept='心内科', borrowDate='2026-10-15'}
  // 手算：recordId = input.recordId = 'REC701'（透传）
  // 手算：status = '已登记'
  it("{recordId='REC701', borrower='王医生'} → recordId='REC701', status='已登记'", () => {
    const input: BorrowRecordInputV14 = {
      recordId: "REC701",
      borrower: "王医生",
      dept: "心内科",
      borrowDate: "2026-10-15",
    };
    const result = registerBorrow(input);
    expect(result.recordId).toBe("REC701");
    expect(result.status).toBe("已登记");
  });
});

describe("registerBorrow 另一记录", () => {
  // 手算：{recordId='REC702', borrower='李医生', dept='呼吸科', borrowDate='2026-10-16'}
  // 手算：recordId = input.recordId = 'REC702'（透传）
  // 手算：status = '已登记'
  it("{recordId='REC702', borrower='李医生'} → recordId='REC702', status='已登记'", () => {
    const input: BorrowRecordInputV14 = {
      recordId: "REC702",
      borrower: "李医生",
      dept: "呼吸科",
      borrowDate: "2026-10-16",
    };
    const result = registerBorrow(input);
    expect(result.recordId).toBe("REC702");
    expect(result.status).toBe("已登记");
  });
});

describe("buildBorrowRecordReport 构建登记报告", () => {
  // 手算：{recordId='REC701', status='已登记'}
  // 手算：透传 recordId + status
  it("{recordId='REC701', status='已登记'} → 正确返回（透传）", () => {
    const report = buildBorrowRecordReport({ recordId: "REC701", status: "已登记" });
    expect(report.recordId).toBe("REC701");
    expect(report.status).toBe("已登记");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-borrow-record auth:true", () => {
    const def = (emrBorrowRecordV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-borrow-record");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
