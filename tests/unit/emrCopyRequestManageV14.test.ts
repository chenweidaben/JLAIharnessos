/**
 * 健澜科技 jlmedaios - 病历复印申请管理 V14 单测（M534-C）
 *
 * 测试 buildCopyRequestManage 构建复印申请、processCopyRequestManage 复印申请处理、buildCopyRequestManageReport 构建报告、读路由 GET auth:true。
 * 命名空间与旧 emrCopyRequestV14 区分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildCopyRequestManage,
  buildCopyRequestManageReport,
  processCopyRequestManage,
  type CopyRequestManageInputV14,
} from "../../src/bff/aggregators/emrCopyRequestManageV14Aggregator";
import { emrCopyRequestManageV14Routes } from "../../src/bff/routes/emrCopyRequestManageV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildCopyRequestManage 构建复印申请", () => {
  // 手算：recordId='REC103', applicant='患者家属' → 正确构建
  it("recordId='REC103', applicant='患者家属' → 正确构建", () => {
    const req = buildCopyRequestManage("REC103", "患者家属");
    expect(req.recordId).toBe("REC103");
    expect(req.applicant).toBe("患者家属");
  });
});

describe("processCopyRequestManage 10页", () => {
  // 手算：{requestId='COPY001', pages=10, purpose='医保报销'}
  // 手算：processed = true
  // 手算：fee = Math.round(10*0.5*10)/10 = Math.round(50)/10 = 50/10 = 5.0
  it("{requestId='COPY001', pages=10, purpose='医保报销'} → processed=true, fee=5.0", () => {
    const input: CopyRequestManageInputV14 = { requestId: "COPY001", pages: 10, purpose: "医保报销" };
    const result = processCopyRequestManage(input);
    expect(result.processed).toBe(true);
    expect(result.fee).toBeCloseTo(5.0, 1);
  });
});

describe("processCopyRequestManage 25页", () => {
  // 手算：{requestId='COPY002', pages=25, purpose='诉讼举证'}
  // 手算：processed = true
  // 手算：fee = Math.round(25*0.5*10)/10 = Math.round(125)/10 = 125/10 = 12.5
  it("{requestId='COPY002', pages=25, purpose='诉讼举证'} → processed=true, fee=12.5", () => {
    const input: CopyRequestManageInputV14 = { requestId: "COPY002", pages: 25, purpose: "诉讼举证" };
    const result = processCopyRequestManage(input);
    expect(result.processed).toBe(true);
    expect(result.fee).toBeCloseTo(12.5, 1);
  });
});

describe("buildCopyRequestManageReport 构建报告", () => {
  // 手算：{processed:true, fee:5.0}
  // 手算：透传 processed + fee
  it("{processed:true, fee:5.0} → 正确返回（透传）", () => {
    const report = buildCopyRequestManageReport({ processed: true, fee: 5.0 });
    expect(report.processed).toBe(true);
    expect(report.fee).toBe(5.0);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-copy-request-manage auth:true", () => {
    const def = (emrCopyRequestManageV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-copy-request-manage");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
