/**
 * 健澜科技 jlmedaios - 病历归档预约 V14 单测（M541-A）
 *
 * 测试 buildArchiveAppoint 构建归档预约、createArchiveAppoint 创建归档预约、buildArchiveAppointReport 构建预约报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildArchiveAppoint,
  buildArchiveAppointReport,
  createArchiveAppoint,
  type ArchiveAppointInputV14,
} from "../../src/bff/aggregators/emrArchiveAppointV14Aggregator";
import { emrArchiveAppointV14Routes } from "../../src/bff/routes/emrArchiveAppointV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildArchiveAppoint 构建归档预约", () => {
  // 手算：recordId='REC800', dept='心内科' → 正确构建
  it("recordId='REC800', dept='心内科' → 正确构建", () => {
    const base = buildArchiveAppoint("REC800", "心内科");
    expect(base.recordId).toBe("REC800");
    expect(base.dept).toBe("心内科");
  });
});

describe("createArchiveAppoint 正常", () => {
  // 手算：{recordId='REC800', appointDate='2026-10-25', operator='张护士'}
  // 手算：appointmentNo = 'ARC' + Date.now().toString().slice(-6) → 以 'ARC' 开头
  // 手算：status = '已预约'
  it("{recordId='REC800', appointDate='2026-10-25'} → appointmentNo 以 ARC 开头, status='已预约'", () => {
    const input: ArchiveAppointInputV14 = { recordId: "REC800", appointDate: "2026-10-25", operator: "张护士" };
    const result = createArchiveAppoint(input);
    expect(result.appointmentNo.startsWith("ARC")).toBe(true);
    expect(result.status).toBe("已预约");
  });
});

describe("createArchiveAppoint 另一预约", () => {
  // 手算：{recordId='REC801', appointDate='2026-10-26', operator='李护士'}
  // 手算：appointmentNo = 'ARC' + Date.now().toString().slice(-6) → 以 'ARC' 开头
  // 手算：status = '已预约'
  it("{recordId='REC801', appointDate='2026-10-26'} → appointmentNo 以 ARC 开头, status='已预约'", () => {
    const input: ArchiveAppointInputV14 = { recordId: "REC801", appointDate: "2026-10-26", operator: "李护士" };
    const result = createArchiveAppoint(input);
    expect(result.appointmentNo.startsWith("ARC")).toBe(true);
    expect(result.status).toBe("已预约");
  });
});

describe("buildArchiveAppointReport 构建预约报告", () => {
  // 手算：{appointmentNo='ARC123456', status='已预约'}
  // 手算：透传 appointmentNo + status
  it("{appointmentNo='ARC123456', status='已预约'} → 正确返回（透传）", () => {
    const report = buildArchiveAppointReport({ appointmentNo: "ARC123456", status: "已预约" });
    expect(report.appointmentNo).toBe("ARC123456");
    expect(report.status).toBe("已预约");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-archive-appoint auth:true", () => {
    const def = (emrArchiveAppointV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-archive-appoint");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
