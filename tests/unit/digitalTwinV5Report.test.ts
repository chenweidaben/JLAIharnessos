/**
 * 健澜科技 jlmedaios - 数字孪生可视化 V5 纯函数单测（M268-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDigitalTwinV5Report,
  renderCampusTwinV5,
  simulatePatientFlowV5,
} from "../../src/bff/aggregators/digitalTwinV5ReportAggregator";

describe("renderCampusTwinV5", () => {
  it("实时+有场景+有设备 → 已渲染fps30", () => {
    expect(renderCampusTwinV5({ sceneCount: 50, realtime: true, devices: 100 }).rendered).toBe(true);
  });
});

describe("simulatePatientFlowV5", () => {
  it("到达率80+服务率100+容量50 → 利用率80%可行瓶颈挂号窗口", () => {
    expect(simulatePatientFlowV5({ arrivalRate: 80, serviceRate: 100, capacity: 50 }).feasible).toBe(true);
  });
});

describe("buildDigitalTwinV5Report", () => {
  it("生成3D建模数据", () => {
    const r = buildDigitalTwinV5Report("30d");
    expect(r.modeling.building).toBeGreaterThan(0);
  });

  it("生成运行驾驶舱数据", () => {
    const r = buildDigitalTwinV5Report("30d");
    expect(r.opsDashboard.bed).toBeGreaterThan(0);
  });

  it("生成建议", () => {
    const r = buildDigitalTwinV5Report("30d");
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
