/**
 * 健澜科技 jlmedaios - 病理报告 TAT V13 单测（M342-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  computeFrozenTATV13,
  computeIntraOpTATV13,
  computeRoutineTATV13,
  type PathologyTurnaroundRecordV13,
} from "../../src/bff/aggregators/pathologyTurnaroundV13Aggregator";
import { pathologyTurnaroundV13Routes } from "../../src/bff/routes/pathologyTurnaroundV13";

const records: PathologyTurnaroundRecordV13[] = [
  { routineTatHours: 24, intraOpTatHours: 1, frozenTatHours: 0.5 },
  { routineTatHours: 48, intraOpTatHours: 2, frozenTatHours: 1 },
  { routineTatHours: 72, intraOpTatHours: 3, frozenTatHours: 1.5 },
];

describe("computeRoutineTATV13", () => {
  // 算式：(24+48+72)/3 = 144/3 = 48.0
  it("常规病理 TAT = 48.0 小时", () => {
    expect(computeRoutineTATV13(records)).toBe(48.0);
  });
  it("空态 → 0", () => {
    expect(computeRoutineTATV13([])).toBe(0);
  });
});

describe("computeIntraOpTATV13", () => {
  // 算式：(1+2+3)/3 = 6/3 = 2.0
  it("术中 TAT = 2.0 小时", () => {
    expect(computeIntraOpTATV13(records)).toBe(2.0);
  });
});

describe("computeFrozenTATV13", () => {
  // 算式：(0.5+1+1.5)/3 = 3/3 = 1.0
  it("冰冻 TAT = 1.0 小时", () => {
    expect(computeFrozenTATV13(records)).toBe(1.0);
  });
});

describe("pathologyTurnaroundV13Routes 读路由", () => {
  it("GET /api/v1/pathology-turnaround 路由存在且 auth:true", () => {
    const route = pathologyTurnaroundV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/pathology-turnaround",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
