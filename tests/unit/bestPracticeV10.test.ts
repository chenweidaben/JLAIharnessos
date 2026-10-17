/**
 * 健澜科技 jlmedaios - 成功案例蒸馏与最佳实践库 V10 单测（M292-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildPracticeLibraryV10,
  distillBestPracticeV10,
  rankBestPracticeV10,
  type BestPracticeV10,
  type SuccessCaseV10,
} from "../../src/bff/aggregators/bestPracticeV10Aggregator";
import { bestPracticeV10Routes } from "../../src/bff/routes/bestPracticeV10";

const cases: SuccessCaseV10[] = [
  { dept: "心内科", condition: "急性心梗", title: "D2B<90", description: "绿色通道" },
  { dept: "心内科", condition: "急性心梗", title: "D2B<90", description: "绿色通道" },
  { dept: "心内科", condition: "急性心衰", title: "早期利尿", description: "3小时" },
  { dept: "急诊科", condition: "过敏性休克", title: "肾上腺素1分钟", description: "黄金1分钟" },
];

describe("distillBestPracticeV10", () => {
  it("4案例→3实践，急性心梗 source_case_cnt=2", () => {
    const ps = distillBestPracticeV10(cases);
    expect(ps.length).toBe(3);
    const ami = ps.find((p) => p.condition === "急性心梗");
    expect(ami?.sourceCaseCnt).toBe(2);
  });
});

describe("rankBestPracticeV10", () => {
  it("score=upvote*2+source：急性心梗(5*2+2=12) > 急性心衰(3*2+1=7) > 过敏(1*2+1=3)", () => {
    const ps: BestPracticeV10[] = distillBestPracticeV10(cases).map((p, idx) => ({
      ...p,
      upvoteCnt: idx === 0 ? 5 : idx === 1 ? 3 : 1,
    }));
    const r = rankBestPracticeV10(ps);
    expect(r[0].condition).toBe("急性心梗");
    expect(r[1].condition).toBe("急性心衰");
    expect(r[2].condition).toBe("过敏性休克");
  });
});

describe("buildPracticeLibraryV10", () => {
  it("total=3 topDept=心内科 avgUpvote=3.0", () => {
    const ps: BestPracticeV10[] = distillBestPracticeV10(cases).map((p, idx) => ({
      ...p,
      upvoteCnt: idx === 0 ? 5 : idx === 1 ? 3 : 1,
    }));
    const lib = buildPracticeLibraryV10(ps);
    expect(lib.total).toBe(3);
    expect(lib.topDept).toBe("心内科");
    expect(lib.avgUpvote).toBe(3);
  });
  it("空态→total=0 topDept=—", () => {
    const lib = buildPracticeLibraryV10([]);
    expect(lib.total).toBe(0);
    expect(lib.topDept).toBe("—");
  });
});

describe("bestPracticeV10Routes 写权限", () => {
  it("POST /api/v1/best-practice/upvote/:id 路由存在且 auth:true", () => {
    const post = bestPracticeV10Routes.find((r) => r.method === "POST" && r.path === "/api/v1/best-practice/upvote/:id");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
