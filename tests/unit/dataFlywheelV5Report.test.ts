/**
 * 健澜科技 jlmedaios - 数据飞轮 V5 纯函数单测（M257-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDataFlywheelV5Report,
  captureSuccessExperienceV5,
  learnFromFailureV5,
} from "../../src/bff/aggregators/dataFlywheelV5ReportAggregator";

describe("captureSuccessExperienceV5", () => {
  it("存活且恢复85分 → 可复用经验", () => {
    expect(captureSuccessExperienceV5({ disease: "肺炎", treatment: "抗生素" }, { survival: true, recovery: 85 }).reusable).toBe(true);
  });
});

describe("learnFromFailureV5", () => {
  it("用药错误+双人核对预防 → 可避免未来", () => {
    expect(learnFromFailureV5({ type: "用药错误" }, { cause: "药品混淆", prevention: "双人核对" }).futureAvoid).toBe(true);
  });
});

describe("buildDataFlywheelV5Report", () => {
  it("生成成功沉淀数据", () => {
    const r = buildDataFlywheelV5Report("30d");
    expect(r.success.case).toBeGreaterThan(0);
  });

  it("生成病例库数据", () => {
    const r = buildDataFlywheelV5Report("30d");
    expect(r.caseLibrary.count).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDataFlywheelV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
