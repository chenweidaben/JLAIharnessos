/**
 * 健澜科技 jlmedaios - 手术量分级 V13 单测（M339-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeGradeDistributionV13,
  type SurgeryVolumeRecordV13,
} from "../../src/bff/aggregators/surgeryVolumeV13Aggregator";
import { surgeryVolumeV13Routes } from "../../src/bff/routes/surgeryVolumeV13";

const records: SurgeryVolumeRecordV13[] = [
  { grade: "一级", count: 20 },
  { grade: "二级", count: 30 },
  { grade: "三级", count: 40 },
  { grade: "四级", count: 10 },
];

describe("computeGradeDistributionV13", () => {
  // 算式：总 100，一级 20/100×100 = 20.0
  it("一级手术占比 = 20.0%", () => {
    const dist = computeGradeDistributionV13(records);
    expect(dist.length).toBe(4);
    expect(dist[0].grade).toBe("一级");
    expect(dist[0].count).toBe(20);
    expect(dist[0].percent).toBe(20.0);
  });
  it("三级手术占比 = 40.0%", () => {
    const dist = computeGradeDistributionV13(records);
    expect(dist[2].grade).toBe("三级");
    expect(dist[2].percent).toBe(40.0);
  });
  it("空态 → 4 项均 0", () => {
    const dist = computeGradeDistributionV13([]);
    expect(dist.length).toBe(0);
  });
  it("总手术数为 0 → 占比 0", () => {
    const zeroRecords: SurgeryVolumeRecordV13[] = [
      { grade: "一级", count: 0 },
    ];
    const dist = computeGradeDistributionV13(zeroRecords);
    expect(dist[0].percent).toBe(0);
  });
});

describe("surgeryVolumeV13Routes 读路由", () => {
  it("GET /api/v1/surgery-volume 路由存在且 auth:true", () => {
    const route = surgeryVolumeV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/surgery-volume",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
