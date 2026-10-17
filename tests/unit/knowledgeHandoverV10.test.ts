/**
 * 健澜科技 jlmedaios - 个人知识图谱与继任者交接 V10 单测（M292-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHandoverPackageV10,
  buildKnowledgeGraphV10,
  rankHandoverPriorityV10,
  type DoctorGraphV10,
} from "../../src/bff/aggregators/knowledgeHandoverV10Aggregator";
import { knowledgeHandoverV10Routes } from "../../src/bff/routes/knowledgeHandoverV10";

describe("buildKnowledgeGraphV10", () => {
  it("success=50 failure=3 practice=10 → density=57 specialty=2", () => {
    const g = buildKnowledgeGraphV10("d-001", "心内科", 50, 3, 10, ["急性心梗", "心衰"]);
    expect(g.specialtyCount).toBe(2);
    expect(g.successCount).toBe(50);
    expect(g.knowledgeDensity).toBe(57);
  });
});

describe("buildHandoverPackageV10", () => {
  it("from d-001 to d-003，summary 包含关键计数", () => {
    const g = buildKnowledgeGraphV10("d-001", "心内科", 50, 3, 10, ["急性心梗"]);
    const pkg = buildHandoverPackageV10("d-001", "d-003", g);
    expect(pkg.fromDoctor).toBe("d-001");
    expect(pkg.toDoctor).toBe("d-003");
    expect(pkg.dept).toBe("心内科");
    expect(pkg.summary).toContain("50个成功案例");
  });
});

describe("rankHandoverPriorityV10", () => {
  it("d-001 density=57 > d-002 density=30", () => {
    const graphs: DoctorGraphV10[] = [
      buildKnowledgeGraphV10("d-002", "急诊科", 30, 5, 5, ["创伤"]),
      buildKnowledgeGraphV10("d-001", "心内科", 50, 3, 10, ["急性心梗"]),
    ];
    const r = rankHandoverPriorityV10(graphs);
    expect(r[0].doctorId).toBe("d-001");
    expect(r[0].knowledgeDensity).toBe(57);
  });
  it("空态→空数组", () => {
    expect(rankHandoverPriorityV10([]).length).toBe(0);
  });
});

describe("knowledgeHandoverV10Routes 写权限", () => {
  it("POST /api/v1/knowledge/handover 路由存在且 auth:true", () => {
    const post = knowledgeHandoverV10Routes.find((r) => r.method === "POST" && r.path === "/api/v1/knowledge/handover");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
