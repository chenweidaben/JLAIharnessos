/**
 * 健澜科技 jlmedaios - 科室经验 SOP 沉淀 V13 单测（M308-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptSopLibraryV13,
  convertTaskToSopV13,
  rankSopByUsageV13,
  type AcceptedTaskV13,
  type DeptSopV13,
} from "../../src/bff/aggregators/deptSopV13Aggregator";
import { deptSopV13Routes } from "../../src/bff/routes/deptSopV13";

const sops: DeptSopV13[] = [
  { sopId: "s1", title: "A", dept: "cardio", actions: ["a1"], scenario: "x", usageCount: 5 },
  { sopId: "s2", title: "B", dept: "cardio", actions: ["b1"], scenario: "y", usageCount: 20 },
  { sopId: "s3", title: "C", dept: "cardio", actions: ["c1"], scenario: "z", usageCount: 10 },
  { sopId: "s4", title: "D", dept: "surgery", actions: ["d1"], scenario: "w", usageCount: 50 },
];

describe("convertTaskToSopV13", () => {
  it("任务转 SOP：title/actions/scenario 透传, sopId=sop-{taskId}", () => {
    const task: AcceptedTaskV13 = {
      taskId: "t1", title: "跨科讨论会", dept: "cardio",
      keyActions: ["邀请外科室", "准备病例"], scenario: "疑难病例",
    };
    const sop = convertTaskToSopV13(task);
    expect(sop.sopId).toBe("sop-t1");
    expect(sop.title).toBe("跨科讨论会");
    expect(sop.actions.length).toBe(2);
    expect(sop.usageCount).toBe(0);
  });
});

describe("rankSopByUsageV13", () => {
  // 算式：s2 usage=20 > s3=10 > s1=5
  // 过滤 cardio 后：s2(20) → s3(10) → s1(5)
  it("cardio SOP 按 usage 降序：s2 → s3 → s1", () => {
    const cardio = buildDeptSopLibraryV13("cardio", sops);
    const ranked = rankSopByUsageV13(cardio);
    expect(ranked[0].sopId).toBe("s2");
    expect(ranked[1].sopId).toBe("s3");
    expect(ranked[2].sopId).toBe("s1");
  });
});

describe("buildDeptSopLibraryV13", () => {
  it("cardio 过滤 → 3 条", () => {
    expect(buildDeptSopLibraryV13("cardio", sops).length).toBe(3);
  });
  it("空态 → 0", () => {
    expect(buildDeptSopLibraryV13("cardio", []).length).toBe(0);
  });
});

describe("deptSopV13Routes 读路由", () => {
  it("GET /api/v1/dept-sop 路由存在且 auth:true", () => {
    const route = deptSopV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-sop",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
