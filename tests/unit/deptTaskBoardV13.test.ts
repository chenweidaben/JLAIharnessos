/**
 * 健澜科技 jlmedaios - 科室任务看板 V13 单测（M308-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeptTaskBoardV13,
  listDeptTasksV13,
  rankDeptByOpenV13,
  type DeptTaskV13,
} from "../../src/bff/aggregators/deptTaskBoardV13Aggregator";
import { deptTaskBoardV13Routes } from "../../src/bff/routes/deptTaskBoardV13";

const tasks: DeptTaskV13[] = [
  { taskId: "t1", title: "a", dept: "cardio", status: "open" },
  { taskId: "t2", title: "b", dept: "cardio", status: "overdue" },
  { taskId: "t3", title: "c", dept: "cardio", status: "done" },
  { taskId: "t4", title: "d", dept: "surgery", status: "overdue" },
  { taskId: "t5", title: "e", dept: "surgery", status: "overdue" },
  { taskId: "t6", title: "f", dept: "pediatrics", status: "verifying" },
];

describe("buildDeptTaskBoardV13", () => {
  // 算式：cardio 3 任务（open=1/overdue=1/done=1/verifying=0）
  // closedRate = done/total = 1/3×100 = 33
  it("cardio 闭环率 = 33", () => {
    const board = buildDeptTaskBoardV13(tasks);
    const cardio = board.find((b) => b.dept === "cardio");
    expect(cardio?.open).toBe(1);
    expect(cardio?.overdue).toBe(1);
    expect(cardio?.done).toBe(1);
    expect(cardio?.closedRate).toBe(33);
  });
  it("空态 → []", () => {
    expect(buildDeptTaskBoardV13([]).length).toBe(0);
  });
});

describe("rankDeptByOpenV13", () => {
  // 算式：surgery overdue=2 > cardio overdue=1 > pediatrics overdue=0
  it("按逾期数 desc：surgery → cardio → pediatrics", () => {
    const board = buildDeptTaskBoardV13(tasks);
    const ranked = rankDeptByOpenV13(board);
    expect(ranked[0].dept).toBe("surgery");
    expect(ranked[1].dept).toBe("cardio");
    expect(ranked[2].dept).toBe("pediatrics");
  });
});

describe("listDeptTasksV13", () => {
  // 算式：cardio 3 任务，逾期排最前 → overdue → open → done
  it("cardio 过滤 + 逾期排最前", () => {
    const list = listDeptTasksV13(tasks, "cardio");
    expect(list.length).toBe(3);
    expect(list[0].status).toBe("overdue");
    expect(list[1].status).toBe("open");
    expect(list[2].status).toBe("done");
  });
});

describe("deptTaskBoardV13Routes 读路由", () => {
  it("GET /api/v1/dept-task-board 路由存在且 auth:true", () => {
    const route = deptTaskBoardV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/dept-task-board",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
