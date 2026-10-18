/**
 * 健澜科技 jlmedaios - 病历借阅归还管理 V14 单测（M534-D，M534 收官）
 *
 * 测试 buildLoanReturn 构建借阅归还、recordLoanReturn 借阅归还记录、buildLoanReturnReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildLoanReturn,
  buildLoanReturnReport,
  recordLoanReturn,
  type LoanReturnInputV14,
} from "../../src/bff/aggregators/emrLoanReturnV14Aggregator";
import { emrLoanReturnV14Routes } from "../../src/bff/routes/emrLoanReturnV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildLoanReturn 构建借阅归还", () => {
  // 手算：recordId='REC104', borrower='心内科王医生' → 正确构建
  it("recordId='REC104', borrower='心内科王医生' → 正确构建", () => {
    const loan = buildLoanReturn("REC104", "心内科王医生");
    expect(loan.recordId).toBe("REC104");
    expect(loan.borrower).toBe("心内科王医生");
  });
});

describe("recordLoanReturn 已归还", () => {
  // 手算：{recordId='REC104', borrowedDate='2026-10-10', returnedDate='2026-10-12'}
  // 手算：returned = returnedDate !== null = true（returnedDate='2026-10-12' 非空）
  // 手算：overdueDays = returned ? 0 : 7 = 0
  it("{recordId='REC104', borrowedDate='2026-10-10', returnedDate='2026-10-12'} → returned=true, overdueDays=0", () => {
    const input: LoanReturnInputV14 = {
      recordId: "REC104",
      borrowedDate: "2026-10-10",
      returnedDate: "2026-10-12",
    };
    const result = recordLoanReturn(input);
    expect(result.returned).toBe(true);
    expect(result.overdueDays).toBe(0);
  });
});

describe("recordLoanReturn 未归还", () => {
  // 手算：{recordId='REC105', borrowedDate='2026-10-15', returnedDate=null}
  // 手算：returned = returnedDate !== null = false（returnedDate=null）
  // 手算：overdueDays = returned ? 0 : 7 = 7
  it("{recordId='REC105', borrowedDate='2026-10-15', returnedDate=null} → returned=false, overdueDays=7", () => {
    const input: LoanReturnInputV14 = {
      recordId: "REC105",
      borrowedDate: "2026-10-15",
      returnedDate: null,
    };
    const result = recordLoanReturn(input);
    expect(result.returned).toBe(false);
    expect(result.overdueDays).toBe(7);
  });
});

describe("buildLoanReturnReport 构建报告", () => {
  // 手算：{returned=false, overdueDays=7}
  // 手算：hint = returned ? '已归还' : '逾期未还' = '逾期未还'
  it("{returned=false, overdueDays=7} → hint='逾期未还'", () => {
    const report = buildLoanReturnReport({ returned: false, overdueDays: 7 });
    expect(report.returned).toBe(false);
    expect(report.overdueDays).toBe(7);
    expect(report.hint).toBe("逾期未还");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-loan-return auth:true", () => {
    const def = (emrLoanReturnV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-loan-return");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
