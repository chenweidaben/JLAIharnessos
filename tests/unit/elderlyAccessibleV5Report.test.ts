/**
 * 健澜科技 jlmedaios - 适老化与无障碍服务 V5 纯函数单测（M261-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  assessElderlyFriendlinessV5,
  buildElderlyAccessibleV5Report,
  designAccessibleUIV5,
} from "../../src/bff/aggregators/elderlyAccessibleV5ReportAggregator";

describe("assessElderlyFriendlinessV5", () => {
  it("四项设施齐全 → 优秀", () => {
    expect(assessElderlyFriendlinessV5({ wheelchair: true, elevator: true, rest: true, lowWindow: true }).grade).toBe("优秀");
  });
});

describe("designAccessibleUIV5", () => {
  it("70岁+低视力+手机 → 大字高对比语音", () => {
    expect(designAccessibleUIV5({ age: 70, vision: "低视力", mobile: true }).fontSize).toBe("大");
  });
});

describe("buildElderlyAccessibleV5Report", () => {
  it("生成适老服务数据", () => {
    const r = buildElderlyAccessibleV5Report("30d");
    expect(r.elderlyService.largeFont).toBeGreaterThan(0);
  });

  it("生成无障碍环境数据", () => {
    const r = buildElderlyAccessibleV5Report("30d");
    expect(r.barrierFree.route).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildElderlyAccessibleV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
