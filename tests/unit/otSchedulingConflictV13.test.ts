/**
 * 健澜科技 jlmedaios - 手术排程冲突检测 V13 单测（M312-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  detectBackToBackGapV13,
  detectRoomConflictV13,
  detectSurgeonConflictV13,
  type SurgerySlotV13,
} from "../../src/bff/aggregators/otSchedulingConflictV13Aggregator";
import { otSchedulingConflictV13Routes } from "../../src/bff/routes/otSchedulingConflictV13";

// 分钟：09:00=540, 09:30=570, 10:00=600, 10:30=630, 11:00=660, 11:20=680, 12:00=720
const surgeries: SurgerySlotV13[] = [
  { surgeryId: "s1", surgeonId: "D001", roomId: "R1", startMin: 540, endMin: 600 },
  { surgeryId: "s2", surgeonId: "D001", roomId: "R2", startMin: 570, endMin: 630 },
  { surgeryId: "s3", surgeonId: "D002", roomId: "R1", startMin: 600, endMin: 660 },
  { surgeryId: "s4", surgeonId: "D003", roomId: "R3", startMin: 680, endMin: 720 },
];

describe("detectSurgeonConflictV13", () => {
  // 算式：s1(09:00-10:00 D001) 与 s2(09:30-10:30 D001) 同医生重叠 → 冲突
  it("s1 ↔ s2 医生 D001 冲突", () => {
    const pairs = detectSurgeonConflictV13(surgeries);
    expect(pairs.length).toBe(1);
    expect(pairs[0].a).toBe("s1");
    expect(pairs[0].b).toBe("s2");
  });
  it("空态 → []", () => {
    expect(detectSurgeonConflictV13([]).length).toBe(0);
  });
});

describe("detectRoomConflictV13", () => {
  // 算式：s1 R1 09:00-10:00, s3 R1 10:00-11:00 相邻不重叠 → 无冲突
  it("R1 相邻不重叠 → 0 冲突", () => {
    expect(detectRoomConflictV13(surgeries).length).toBe(0);
  });
});

describe("detectBackToBackGapV13", () => {
  // 算式：按 startMin 排序：s1(09:00), s2(09:30), s3(10:00), s4(11:20)
  // s1→s2: s1.end=10:00, s2.start=09:30 → gap=570-600=-30（重叠） < 30 → 告警
  // s2→s3: s2.end=10:30=630, s3.start=10:00=600 → gap=600-630=-30 < 30 → 告警
  // s3→s4: s3.end=11:00=660, s4.start=11:20=680 → gap=680-660=20 < 30 → 告警
  it("3 对告警（s1-s2 / s2-s3 / s3-s4）", () => {
    const alerts = detectBackToBackGapV13(surgeries, 30);
    expect(alerts.length).toBe(3);
  });
});

describe("otSchedulingConflictV13Routes 读路由", () => {
  it("GET /api/v1/ot-scheduling-conflict 路由存在且 auth:true", () => {
    const route = otSchedulingConflictV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/ot-scheduling-conflict",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
