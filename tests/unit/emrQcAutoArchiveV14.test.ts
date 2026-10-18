/**
 * 健澜科技 jlmedaios - 病历自动归档触发 V14 单测（M521-A）
 *
 * 测试 buildAutoArchive 构建归档、triggerAutoArchive 触发归档、buildAutoArchiveReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildAutoArchive,
  buildAutoArchiveReport,
  triggerAutoArchive,
  type AutoArchiveConfigV14,
} from "../../src/bff/aggregators/emrQcAutoArchiveV14Aggregator";
import { emrQcAutoArchiveV14Routes } from "../../src/bff/routes/emrQcAutoArchiveV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildAutoArchive 构建归档", () => {
  // 手算：recordId='REC021', dept='心内科', daysSinceDischarge=35 → 正确构建
  it("recordId='REC021', dept='心内科', daysSinceDischarge=35 → 正确构建", () => {
    const archive = buildAutoArchive("REC021", "心内科", 35);
    expect(archive.recordId).toBe("REC021");
    expect(archive.dept).toBe("心内科");
    expect(archive.daysSinceDischarge).toBe(35);
  });
});

describe("triggerAutoArchive 触发成功", () => {
  // 手算：record={...daysSinceDischarge:35}, config={archiveAfterDays:30, requireQcPass:true, qcPassed:true}
  // 手算：35>=30 且 requireQcPass=true 且 qcPassed=true → triggered=true, reason='满足归档条件'
  it("record={...daysSinceDischarge:35}, config={archiveAfterDays:30, requireQcPass:true, qcPassed:true} → triggered=true, reason='满足归档条件'", () => {
    const record = buildAutoArchive("REC021", "心内科", 35);
    const config: AutoArchiveConfigV14 = { archiveAfterDays: 30, requireQcPass: true, qcPassed: true };
    const result = triggerAutoArchive(record, config);
    expect(result.triggered).toBe(true);
    expect(result.reason).toBe("满足归档条件");
  });
});

describe("triggerAutoArchive 未通过质控", () => {
  // 手算：record={...daysSinceDischarge:35}, config={archiveAfterDays:30, requireQcPass:true, qcPassed:false}
  // 手算：35>=30 但 requireQcPass=true 且 qcPassed=false → triggered=false（qc未通过）
  it("record={...daysSinceDischarge:35}, config={archiveAfterDays:30, requireQcPass:true, qcPassed:false} → triggered=false", () => {
    const record = buildAutoArchive("REC021", "心内科", 35);
    const config: AutoArchiveConfigV14 = { archiveAfterDays: 30, requireQcPass: true, qcPassed: false };
    const result = triggerAutoArchive(record, config);
    expect(result.triggered).toBe(false);
  });
});

describe("triggerAutoArchive 未达天数", () => {
  // 手算：record={...daysSinceDischarge:20}, config={archiveAfterDays:30, requireQcPass:false, qcPassed:true}
  // 手算：20<30 → triggered=false（未达天数）
  it("record={...daysSinceDischarge:20}, config={archiveAfterDays:30, requireQcPass:false, qcPassed:true} → triggered=false", () => {
    const record = buildAutoArchive("REC021", "心内科", 20);
    const config: AutoArchiveConfigV14 = { archiveAfterDays: 30, requireQcPass: false, qcPassed: true };
    const result = triggerAutoArchive(record, config);
    expect(result.triggered).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-auto-archive auth:true", () => {
    const def = (emrQcAutoArchiveV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-auto-archive");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
