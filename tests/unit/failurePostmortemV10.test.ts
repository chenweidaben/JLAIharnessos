/**
 * 健澜科技 jlmedaios - 失败案例根因复盘与防再发机制 V10 单测（M292-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  analyzeFailureRootCauseV10,
  buildFailurePostmortemV10,
  buildPreventionPlanV10,
  type FailureEventV10,
} from "../../src/bff/aggregators/failurePostmortemV10Aggregator";
import { failurePostmortemV10Routes } from "../../src/bff/routes/failurePostmortemV10";

describe("analyzeFailureRootCauseV10", () => {
  it("含'漏诊'→diagnosis_error", () => {
    expect(analyzeFailureRootCauseV10({ description: "漏诊急性心梗" }, [])).toBe("diagnosis_error");
  });
  it("含'剂量'→medication_error", () => {
    expect(analyzeFailureRootCauseV10({ description: "华法林剂量过大" }, [])).toBe("medication_error");
  });
  it("含'交接延迟'→communication_delay", () => {
    expect(analyzeFailureRootCauseV10({ description: "交接延迟" }, [])).toBe("communication_delay");
  });
  it("无关键词→process_breakdown", () => {
    expect(analyzeFailureRootCauseV10({ description: "流程混乱" }, [])).toBe("process_breakdown");
  });
});

describe("buildPreventionPlanV10", () => {
  it("medication_error 返回剂量/配伍前置审核措施", () => {
    expect(buildPreventionPlanV10("medication_error")).toContain("前置审核");
  });
});

describe("buildFailurePostmortemV10", () => {
  it("3类根因按复发总次数降序：medication(3) > diagnosis(2) > comm(1)", () => {
    const cases: FailureEventV10[] = [
      { id: "f-1", dept: "心内科", patientCase: "a", rootCause: "medication_error", description: "药", recurrenceCnt: 3 },
      { id: "f-2", dept: "心内科", patientCase: "b", rootCause: "diagnosis_error", description: "诊", recurrenceCnt: 2 },
      { id: "f-3", dept: "急诊科", patientCase: "c", rootCause: "communication_delay", description: "沟", recurrenceCnt: 1 },
    ];
    const r = buildFailurePostmortemV10(cases);
    expect(r[0].rootCause).toBe("medication_error");
    expect(r[0].totalRecurrence).toBe(3);
    expect(r[1].rootCause).toBe("diagnosis_error");
    expect(r[2].rootCause).toBe("communication_delay");
  });
  it("空态→空数组", () => {
    expect(buildFailurePostmortemV10([]).length).toBe(0);
  });
});

describe("failurePostmortemV10Routes 写权限", () => {
  it("POST /api/v1/failure/postmortem 路由存在且 auth:true", () => {
    const post = failurePostmortemV10Routes.find((r) => r.method === "POST" && r.path === "/api/v1/failure/postmortem");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
