/**
 * 健澜科技 jlmedaios - 推送频控与免打扰 V13 单测（M302-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDndWindowV13,
  computePushQuotaV13,
  filterWithinQuotaV13,
  type QuotaPushV13,
} from "../../src/bff/aggregators/pushQuotaV13Aggregator";
import { pushQuotaV13Routes } from "../../src/bff/routes/pushQuotaV13";

const pushList: QuotaPushV13[] = [
  { experienceId: "e-1", title: "房颤华法林" },
  { experienceId: "e-2", title: "术后低体温" },
  { experienceId: "e-3", title: "阿司匹林" },
  { experienceId: "e-4", title: "压疮" },
  { experienceId: "e-5", title: "抗生素" },
  { experienceId: "e-6", title: "VTE" },
  { experienceId: "e-7", title: "血糖" },
  { experienceId: "e-8", title: "疼痛" },
  { experienceId: "e-9", title: "营养" },
  { experienceId: "e-10", title: "康复" },
];

describe("computePushQuotaV13", () => {
  it("接诊70>60 → 8条", () => {
    expect(computePushQuotaV13(70)).toBe(8);
  });
  it("接诊45 在 30-60 → 5条", () => {
    expect(computePushQuotaV13(45)).toBe(5);
  });
  it("接诊20<30 → 3条", () => {
    expect(computePushQuotaV13(20)).toBe(3);
  });
});

describe("filterWithinQuotaV13", () => {
  it("10条 配额5 → 剩5条", () => {
    const filtered = filterWithinQuotaV13(pushList, 5);
    expect(filtered.length).toBe(5);
    expect(filtered[0].experienceId).toBe("e-1");
  });
  it("空态 → 0", () => {
    expect(filterWithinQuotaV13([], 5).length).toBe(0);
  });
});

describe("buildDndWindowV13", () => {
  it("默认 22:00-07:00", () => {
    const w = buildDndWindowV13();
    expect(w.startHour).toBe(22);
    expect(w.endHour).toBe(7);
  });
});

describe("pushQuotaV13Routes 读路由", () => {
  it("GET /api/v1/push-quota 路由存在且 auth:true", () => {
    const route = pushQuotaV13Routes.find(
      (r) => r.method === "GET" && r.path === "/api/v1/push-quota",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
