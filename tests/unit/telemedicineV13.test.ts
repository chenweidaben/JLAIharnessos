/**
 * 健澜科技 jlmedaios - 远程会诊量 V13 单测（M324-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  classifyConsultByDeptV13,
  computeAvgResponseTimeV13,
  countMonthlyConsultationsV13,
  type TeleconsultationV13,
} from "../../src/bff/aggregators/telemedicineV13Aggregator";
import { telemedicineV13Routes } from "../../src/bff/routes/telemedicineV13";

const consults: TeleconsultationV13[] = [
  { dept: "心内科", responseMinutes: 15 },
  { dept: "心内科", responseMinutes: 20 },
  { dept: "心内科", responseMinutes: 10 },
  { dept: "呼吸科", responseMinutes: 25 },
  { dept: "呼吸科", responseMinutes: 30 },
  { dept: "呼吸科", responseMinutes: 12 },
  { dept: "呼吸科", responseMinutes: 18 },
  { dept: "神经科", responseMinutes: 22 },
  { dept: "神经科", responseMinutes: 8 },
  { dept: "神经科", responseMinutes: 15 },
];

describe("countMonthlyConsultationsV13", () => {
  // 算式：10 次
  it("本月会诊次数 = 10", () => {
    expect(countMonthlyConsultationsV13(consults)).toBe(10);
  });
  it("空态 → 0", () => {
    expect(countMonthlyConsultationsV13([])).toBe(0);
  });
});

describe("computeAvgResponseTimeV13", () => {
  // 算式：(15+20+10+25+30+12+18+22+8+15)/10 = 175/10 = 17.5
  it("平均响应 = 17.5 分钟", () => {
    expect(computeAvgResponseTimeV13(consults)).toBe(17.5);
  });
});

describe("classifyConsultByDeptV13", () => {
  // 算式：心内科3 / 呼吸科4 / 神经科3
  it("科室分布 = 3个科室", () => {
    const result = classifyConsultByDeptV13(consults);
    expect(result.length).toBe(3);
    expect(result.find((d) => d.dept === "心内科")?.count).toBe(3);
    expect(result.find((d) => d.dept === "呼吸科")?.count).toBe(4);
    expect(result.find((d) => d.dept === "神经科")?.count).toBe(3);
  });
});

describe("telemedicineV13Routes 读路由", () => {
  it("GET /api/v1/telemedicine-overview 路由存在且 auth:true", () => {
    const route = telemedicineV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/telemedicine-overview",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
