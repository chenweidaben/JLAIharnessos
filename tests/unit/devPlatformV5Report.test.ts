/**
 * 健澜科技 jlmedaios - 医院开发者平台 V5 纯函数单测（M260-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDevPlatformV5Report,
  composeWorkflowV5,
  publishAPIV5,
} from "../../src/bff/aggregators/devPlatformV5ReportAggregator";

describe("composeWorkflowV5", () => {
  it("表单+审批两步 → 无代码工作流", () => {
    expect(composeWorkflowV5([{ name: "申请表单", type: "form" }, { name: "科室审批", type: "approval" }]).noCode).toBe(true);
  });
});

describe("publishAPIV5", () => {
  it("发布 patient-api v2.0 → 成功带沙箱", () => {
    expect(publishAPIV5("patient-api", "v2.0").published).toBe(true);
  });
});

describe("buildDevPlatformV5Report", () => {
  it("生成API市场数据", () => {
    const r = buildDevPlatformV5Report("30d");
    expect(r.apiMarket.catalog).toBeGreaterThan(0);
  });

  it("生成低代码数据", () => {
    const r = buildDevPlatformV5Report("30d");
    expect(r.lowCode.form).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDevPlatformV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
