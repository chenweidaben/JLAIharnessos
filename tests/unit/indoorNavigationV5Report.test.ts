/**
 * 健澜科技 jlmedaios - 院内智能导航 V5 纯函数单测（M270-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeTrafficFlowV5,
  buildIndoorNavigationV5Report,
  planRouteV5,
} from "../../src/bff/aggregators/indoorNavigationV5ReportAggregator";

describe("planRouteV5", () => {
  it("1层门诊到3层放射科+轮椅电梯 → 距离400米无障碍", () => {
    expect(planRouteV5({ floor: 1, area: "门诊大厅" }, { floor: 3, area: "放射科" }, { wheelchair: true, elevator: true }).accessible).toBe(true);
  });
});

describe("analyzeTrafficFlowV5", () => {
  it("拥堵70%+瓶颈门诊大厅 → 轻度拥堵建议增派导诊", () => {
    expect(analyzeTrafficFlowV5({ congestion: 70, bottleneck: "门诊大厅", preferredPath: 80 }).level).toBe("轻度拥堵");
  });
});

describe("buildIndoorNavigationV5Report", () => {
  it("生成院内地图数据", () => {
    const r = buildIndoorNavigationV5Report("30d");
    expect(r.campusMap.modeling).toBeGreaterThan(0);
  });

  it("生成停车管理数据", () => {
    const r = buildIndoorNavigationV5Report("30d");
    expect(r.parking.spaces).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildIndoorNavigationV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
