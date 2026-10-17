/**
 * 健澜科技 jlmedaios - 内镜检查量 V13 单测（M342-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeBronchoscopyCountV13,
  computeColonoscopyCountV13,
  computeGastroscopyCountV13,
  type EndoscopyVolumeRecordV13,
} from "../../src/bff/aggregators/endoscopyVolumeV13Aggregator";
import { endoscopyVolumeV13Routes } from "../../src/bff/routes/endoscopyVolumeV13";

const records: EndoscopyVolumeRecordV13[] = [
  { gastroscopyCount: 100, colonoscopyCount: 50, bronchoscopyCount: 20 },
  { gastroscopyCount: 200, colonoscopyCount: 100, bronchoscopyCount: 30 },
];

describe("computeGastroscopyCountV13", () => {
  // 算式：100+200 = 300
  it("胃镜月度例数 = 300", () => {
    expect(computeGastroscopyCountV13(records)).toBe(300);
  });
  it("空态 → 0", () => {
    expect(computeGastroscopyCountV13([])).toBe(0);
  });
});

describe("computeColonoscopyCountV13", () => {
  // 算式：50+100 = 150
  it("肠镜月度例数 = 150", () => {
    expect(computeColonoscopyCountV13(records)).toBe(150);
  });
});

describe("computeBronchoscopyCountV13", () => {
  // 算式：20+30 = 50
  it("支气管镜月度例数 = 50", () => {
    expect(computeBronchoscopyCountV13(records)).toBe(50);
  });
});

describe("endoscopyVolumeV13Routes 读路由", () => {
  it("GET /api/v1/endoscopy-volume 路由存在且 auth:true", () => {
    const route = endoscopyVolumeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/endoscopy-volume",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
