/**
 * 健澜科技 jlmedaios - 病历归还提醒 V14 单测（M540-C）
 *
 * 测试 buildReturnRemind 构建归还提醒、detectOverdue 逾期检测、buildReturnRemindReport 构建提醒报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildReturnRemind,
  buildReturnRemindReport,
  detectOverdue,
  type ReturnRemindInputV14,
} from "../../src/bff/aggregators/emrReturnRemindV14Aggregator";
import { emrReturnRemindV14Routes } from "../../src/bff/routes/emrReturnRemindV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildReturnRemind 构建归还提醒", () => {
  // 手算：recordId='REC703', borrower='李医生' → 正确构建
  it("recordId='REC703', borrower='李医生' → 正确构建", () => {
    const base = buildReturnRemind("REC703", "李医生");
    expect(base.recordId).toBe("REC703");
    expect(base.borrower).toBe("李医生");
  });
});

describe("detectOverdue 未逾期", () => {
  // 手算：{borrowDays=5, overdueThreshold=7}
  // 手算：overdue = borrowDays > overdueThreshold = 5 > 7 = false
  // 手算：remindLevel = overdue ? ... : '无需提醒' = '无需提醒'
  it("{borrowDays=5, overdueThreshold=7} → overdue=false, remindLevel='无需提醒'", () => {
    const input: ReturnRemindInputV14 = { borrowDays: 5, overdueThreshold: 7 };
    const result = detectOverdue(input);
    expect(result.overdue).toBe(false);
    expect(result.remindLevel).toBe("无需提醒");
  });
});

describe("detectOverdue 普通逾期", () => {
  // 手算：{borrowDays=10, overdueThreshold=7}
  // 手算：overdue = borrowDays > overdueThreshold = 10 > 7 = true
  // 手算：remindLevel = overdue ? (borrowDays > overdueThreshold + 7 ? '紧急提醒' : '普通提醒')
  //   borrowDays=10, overdueThreshold+7=14, 10 > 14 = false → '普通提醒'
  it("{borrowDays=10, overdueThreshold=7} → overdue=true, remindLevel='普通提醒'", () => {
    const input: ReturnRemindInputV14 = { borrowDays: 10, overdueThreshold: 7 };
    const result = detectOverdue(input);
    expect(result.overdue).toBe(true);
    expect(result.remindLevel).toBe("普通提醒");
  });
});

describe("buildReturnRemindReport 构建提醒报告", () => {
  // 手算：{overdue=true, remindLevel='普通提醒'}
  // 手算：透传 overdue + remindLevel
  it("{overdue=true, remindLevel='普通提醒'} → 正确返回（透传）", () => {
    const report = buildReturnRemindReport({ overdue: true, remindLevel: "普通提醒" });
    expect(report.overdue).toBe(true);
    expect(report.remindLevel).toBe("普通提醒");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-return-remind auth:true", () => {
    const def = (emrReturnRemindV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-return-remind");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
