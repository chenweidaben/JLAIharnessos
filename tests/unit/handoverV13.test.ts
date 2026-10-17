/**
 * 健澜科技 jlmedaios - 继任者经验传承交接 V13 单测（M297-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildHandoverInboxV13,
  buildHandoverPackageV13,
  confirmHandoverV13,
  type HandoverExperienceV13,
  type HandoverPackageV13,
} from "../../src/bff/aggregators/handoverV13Aggregator";
import { handoverV13Routes } from "../../src/bff/routes/handoverV13";

const experiences: HandoverExperienceV13[] = [
  { experienceId: "e-1", title: "房颤", bucket: "fresh" },
  { experienceId: "e-2", title: "术后", bucket: "fresh" },
  { experienceId: "e-3", title: "VTE", bucket: "stale" },
];

describe("buildHandoverPackageV13", () => {
  it("3条经验（2 fresh/1 stale）→ 计数正确，适配提示为'新鲜'", () => {
    const pkg = buildHandoverPackageV13("zhang", "li", experiences);
    expect(pkg.experienceCount).toBe(3);
    expect(pkg.freshCount).toBe(2);
    expect(pkg.staleCount).toBe(1);
    expect(pkg.status).toBe("pending");
  });
  it("stale>fresh → 提示先复核", () => {
    const pkg = buildHandoverPackageV13("wang", "zhao", [
      { experienceId: "e-1", title: "x", bucket: "stale" },
      { experienceId: "e-2", title: "y", bucket: "stale" },
      { experienceId: "e-3", title: "z", bucket: "fresh" },
    ]);
    expect(pkg.adaptationNote).toContain("先复核");
  });
});

describe("confirmHandoverV13", () => {
  it("accept → accepted", () => {
    const pkg = buildHandoverPackageV13("zhang", "li", experiences);
    const r = confirmHandoverV13(pkg, "accept");
    expect(r.status).toBe("accepted");
  });
  it("reject → rejected", () => {
    const pkg = buildHandoverPackageV13("zhang", "li", experiences);
    const r = confirmHandoverV13(pkg, "reject");
    expect(r.status).toBe("rejected");
  });
});

describe("buildHandoverInboxV13", () => {
  it("toDoc=li → 只返回 pkg-zhang-li（pending）", () => {
    const all: HandoverPackageV13[] = [
      {
        packageId: "pkg-zhang-li", fromDoctor: "zhang", toDoctor: "li",
        experienceCount: 3, freshCount: 2, staleCount: 1,
        adaptationNote: "x", status: "pending",
      },
      {
        packageId: "pkg-wang-zhao", fromDoctor: "wang", toDoctor: "zhao",
        experienceCount: 5, freshCount: 1, staleCount: 3,
        adaptationNote: "y", status: "pending",
      },
      {
        packageId: "pkg-li-accepted", fromDoctor: "li", toDoctor: "wang",
        experienceCount: 1, freshCount: 1, staleCount: 0,
        adaptationNote: "z", status: "accepted",
      },
    ];
    const inbox = buildHandoverInboxV13("li", all);
    expect(inbox.length).toBe(1);
    expect(inbox[0].packageId).toBe("pkg-zhang-li");
  });
  it("空态→0", () => {
    expect(buildHandoverInboxV13("li", []).length).toBe(0);
  });
});

describe("handoverV13Routes 写路由", () => {
  it("POST /api/v1/handover/:id/confirm 路由存在且 auth:true", () => {
    const route = handoverV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/handover/:id/confirm",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
