/**
 * 健澜科技 jlmedaios - 病历质控等级评定 V14 单测（M479-C）
 *
 * 测试 evaluateQcGrade 等级评定、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import { evaluateQcGrade, type QcGradeResultV14 } from "../../src/bff/aggregators/emrQcGradeV14Aggregator";
import { emrQcGradeV14Routes } from "../../src/bff/routes/emrQcGradeV14";
import type { RouteDef } from "../../src/bff/types";

describe("evaluateQcGrade 优秀", () => {
  // 手算：score=95 → >=90 → 优秀
  it("score=95 → grade=优秀", () => {
    const result: QcGradeResultV14 = evaluateQcGrade(95);
    expect(result.grade).toBe("优秀");
  });
});

describe("evaluateQcGrade 良好", () => {
  // 手算：score=85 → 80-89 → 良好
  it("score=85 → grade=良好", () => {
    const result: QcGradeResultV14 = evaluateQcGrade(85);
    expect(result.grade).toBe("良好");
  });
});

describe("evaluateQcGrade 合格", () => {
  // 手算：score=70 → 60-79 → 合格
  it("score=70 → grade=合格", () => {
    const result: QcGradeResultV14 = evaluateQcGrade(70);
    expect(result.grade).toBe("合格");
  });
});

describe("evaluateQcGrade 不合格", () => {
  // 手算：score=50 → <60 → 不合格
  it("score=50 → grade=不合格", () => {
    const result: QcGradeResultV14 = evaluateQcGrade(50);
    expect(result.grade).toBe("不合格");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-qc-grade auth:true", () => {
    const def = (emrQcGradeV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-qc-grade");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
