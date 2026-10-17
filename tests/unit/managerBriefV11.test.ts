/**
 * 健澜科技 jlmedaios - MANAGER_MUSE 主动式周会简报 V11 单测（M293-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildManagerBriefV11,
  formatManagerBriefV11,
  prioritizeManagerBriefV11,
  type ApprovalV11,
  type ComplaintV11,
  type FailureHotspotV11,
  type KnowledgeGrowthV11,
  type ManagerKpiV11,
} from "../../src/bff/aggregators/managerBriefV11Aggregator";
import { managerBriefV11Routes } from "../../src/bff/routes/managerBriefV11";

const kpis: ManagerKpiV11[] = [
  { kpiId: "k1", name: "门诊量", value: 9000, target: 10000 },
  { kpiId: "k2", name: "满意度", value: 92, target: 90 },
];

const complaints: ComplaintV11[] = [
  { complaintId: "c-1", level: "major", title: "排队" },
];

const approvals: ApprovalV11[] = [
  { approvalId: "ap-1", title: "采购" },
];

const knowledgeGrowth: KnowledgeGrowthV11 = { deltaPct: 18 };

const hotspots: FailureHotspotV11[] = [
  { rootCause: "medication_error", count: 12 },
];

describe("buildManagerBriefV11", () => {
  it("聚合 1major+1kpiRed+1hotspot+1approval+1kg=5条，五类计数正确", () => {
    const b = buildManagerBriefV11("m-001", kpis, complaints, approvals, knowledgeGrowth, hotspots);
    expect(b.items.length).toBe(5);
    expect(b.majorComplaintCount).toBe(1);
    expect(b.kpiRedCount).toBe(1);
    expect(b.failureHotspotCount).toBe(1);
    expect(b.approvalCount).toBe(1);
    expect(b.knowledgeGrowthPct).toBe(18);
  });
  it("空态→全部为0（知识增长默认0）", () => {
    const b = buildManagerBriefV11("m-001", [], [], [], { deltaPct: 0 }, []);
    expect(b.items.length).toBe(1); // 仅 knowledgeGrowth 条目
    expect(b.majorComplaintCount).toBe(0);
  });
});

describe("prioritizeManagerBriefV11", () => {
  it("majorComplaint > kpiRed > failureHotspot > approval > knowledgeGrowth", () => {
    const b = buildManagerBriefV11("m-001", kpis, complaints, approvals, knowledgeGrowth, hotspots);
    const r = prioritizeManagerBriefV11(b.items);
    expect(r[0].category).toBe("majorComplaint");
    expect(r[1].category).toBe("kpiRed");
    expect(r[2].category).toBe("failureHotspot");
    expect(r[3].category).toBe("approval");
    expect(r[4].category).toBe("knowledgeGrowth");
  });
});

describe("formatManagerBriefV11", () => {
  it("文本含关键数字：1起投诉/1KPI/1热点/1审批/+18%", () => {
    const b = buildManagerBriefV11("m-001", kpis, complaints, approvals, knowledgeGrowth, hotspots);
    const text = formatManagerBriefV11(b);
    expect(text).toContain("1起重大投诉");
    expect(text).toContain("1项KPI红项");
    expect(text).toContain("1个失败复发热点");
    expect(text).toContain("1项待审批");
    expect(text).toContain("+18%");
  });
});

describe("managerBriefV11Routes 读路由", () => {
  it("GET /api/v1/manager-brief 路由存在且 auth:true", () => {
    const route = managerBriefV11Routes.find((r) => r.method === "GET" && r.path === "/api/v1/manager-brief");
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
