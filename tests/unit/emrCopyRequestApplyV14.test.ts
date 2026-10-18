/**
 * 健澜科技 jlmedaios - 病历复印申请管理（避让版）V14 单测（M540-A）
 *
 * 测试 buildCopyRequestApply 构建复印申请、createCopyRequestApply 创建复印申请、buildCopyRequestApplyReport 构建申请报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCopyRequestApply,
  buildCopyRequestApplyReport,
  createCopyRequestApply,
  type CopyRequestApplyInputV14,
} from "../../src/bff/aggregators/emrCopyRequestApplyV14Aggregator";
import { emrCopyRequestApplyV14Routes } from "../../src/bff/routes/emrCopyRequestApplyV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCopyRequestApply 构建复印申请", () => {
  // 手算：recordId='REC700', applicant='患者本人' → 正确构建
  it("recordId='REC700', applicant='患者本人' → 正确构建", () => {
    const base = buildCopyRequestApply("REC700", "患者本人");
    expect(base.recordId).toBe("REC700");
    expect(base.applicant).toBe("患者本人");
  });
});

describe("createCopyRequestApply 10页", () => {
  // 手算：{recordId='REC700', pages=10, purpose='医保报销'}
  // 手算：requestId = 'COPY' + Date.now().toString().slice(-6) → 以 'COPY' 开头
  // 手算：fee = Math.round(pages * 0.5 * 10) / 10 = Math.round(10*0.5*10)/10 = Math.round(50)/10 = 5.0
  it("{recordId='REC700', pages=10} → requestId 以 COPY 开头, fee=5.0", () => {
    const input: CopyRequestApplyInputV14 = { recordId: "REC700", pages: 10, purpose: "医保报销" };
    const result = createCopyRequestApply(input);
    expect(result.requestId.startsWith("COPY")).toBe(true);
    expect(result.fee).toBe(5.0);
  });
});

describe("createCopyRequestApply 20页", () => {
  // 手算：{recordId='REC701', pages=20, purpose='诉讼举证'}
  // 手算：fee = Math.round(pages * 0.5 * 10) / 10 = Math.round(20*0.5*10)/10 = Math.round(100)/10 = 10.0
  it("{recordId='REC701', pages=20} → fee=10.0", () => {
    const input: CopyRequestApplyInputV14 = { recordId: "REC701", pages: 20, purpose: "诉讼举证" };
    const result = createCopyRequestApply(input);
    expect(result.fee).toBe(10.0);
  });
});

describe("buildCopyRequestApplyReport 构建申请报告", () => {
  // 手算：{requestId='COPY123456', fee=5.0}
  // 手算：透传 requestId + fee
  it("{requestId='COPY123456', fee=5.0} → 正确返回（透传）", () => {
    const report = buildCopyRequestApplyReport({ requestId: "COPY123456", fee: 5.0 });
    expect(report.requestId).toBe("COPY123456");
    expect(report.fee).toBe(5.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-copy-request-apply auth:true", () => {
    const def = (emrCopyRequestApplyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-copy-request-apply");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
