/**
 * 健澜科技 jlmedaios - 病历质控 PDCA 循环管理 V14 单测（M468-D）
 *
 * 测试 buildPdcaPlan 初始阶段、advancePdcaStage 阶段推进、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  advancePdcaStage,
  buildPdcaPlan,
  type PdcaPlanV14,
} from "../../src/bff/aggregators/emrPdcaV14Aggregator";
import { emrPdcaV14Routes } from "../../src/bff/routes/emrPdcaV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildPdcaPlan 初始阶段", () => {
  // 手算：新建计划 → stage='plan'，title 正确传入
  it("stage='plan'，title 正确", () => {
    const plan = buildPdcaPlan("降低缺陷率", "通过规则引擎");
    expect(plan.stage).toBe("plan");
    expect(plan.title).toBe("降低缺陷率");
  });
});

describe("advancePdcaStage plan→do", () => {
  // 手算：plan → 推进到 do
  it("plan→do", () => {
    const plan: PdcaPlanV14 = { id: "P001", title: "测试", description: "", stage: "plan" };
    const advanced = advancePdcaStage(plan);
    expect(advanced.stage).toBe("do");
  });
});

describe("advancePdcaStage do→check", () => {
  // 手算：do → 推进到 check
  it("do→check", () => {
    const plan: PdcaPlanV14 = { id: "P001", title: "测试", description: "", stage: "do" };
    const advanced = advancePdcaStage(plan);
    expect(advanced.stage).toBe("check");
  });
});

describe("advancePdcaStage act 终态", () => {
  // 手算：act 是终态 → 不再推进，保持 act
  it("act→act（终态不变）", () => {
    const plan: PdcaPlanV14 = { id: "P001", title: "测试", description: "", stage: "act" };
    const advanced = advancePdcaStage(plan);
    expect(advanced.stage).toBe("act");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-pdca auth:true", () => {
    const def = (emrPdcaV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-pdca");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
