/**
 * 健澜科技 jlmedaios - 患者就诊 360° 全视图 V14 单测（M465-C）
 *
 * 测试 buildPatientTimeline 乱序→升序、aggregateVisitHistory totalVisits=2、同科室去重=1、dischargeDate 为空不报错、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateVisitHistory,
  buildPatientTimeline,
  type PatientEventV14,
  type VisitRecordV14,
} from "../../src/bff/aggregators/emrPatient360V14Aggregator";
import { emrPatient360V14Routes } from "../../src/bff/routes/emrPatient360V14";
import type { RouteDef } from "../../src/bff/types";

const events: PatientEventV14[] = [
  { id: "E001", type: "visit", title: "入院", eventTime: "2026-10-01T08:00:00Z" },
  { id: "E002", type: "lab", title: "血常规", eventTime: "2026-10-01T10:00:00Z" },
  { id: "E003", type: "diagnosis", title: "确诊", eventTime: "2026-10-02T09:00:00Z" },
];

describe("buildPatientTimeline 乱序→升序", () => {
  // 手算：乱序 [E003(10-02), E001(10-01), E002(10-01)] → 排序后 [E001, E002, E003]
  it("3 个乱序事件 → 按时间升序", () => {
    const unsorted = [events[2], events[0], events[1]];
    const sorted = buildPatientTimeline(unsorted);
    expect(sorted[0]?.id).toBe("E001");
    expect(sorted[1]?.id).toBe("E002");
    expect(sorted[2]?.id).toBe("E003");
  });
});

describe("aggregateVisitHistory totalVisits", () => {
  // 手算：2 次就诊 → totalVisits=2
  it("2 次就诊 → totalVisits=2", () => {
    const visits: VisitRecordV14[] = [
      { visitId: "V001", dept: "呼吸科", admissionDate: "2026-10-01T08:00:00Z" },
      { visitId: "V002", dept: "心内科", admissionDate: "2026-04-01T08:00:00Z" },
    ];
    const result = aggregateVisitHistory(visits);
    expect(result.totalVisits).toBe(2);
  });
});

describe("aggregateVisitHistory 同科室去重", () => {
  // 手算：2 次就诊都在呼吸科 → departments 去重后 1 个
  it("2 次就诊同科室 → departments 去重后 1 个", () => {
    const visits: VisitRecordV14[] = [
      { visitId: "V001", dept: "呼吸科", admissionDate: "2026-10-01T08:00:00Z" },
      { visitId: "V002", dept: "呼吸科", admissionDate: "2026-04-01T08:00:00Z" },
    ];
    const result = aggregateVisitHistory(visits);
    expect(result.departments.length).toBe(1);
    expect(result.departments[0]).toBe("呼吸科");
  });
});

describe("aggregateVisitHistory dischargeDate 为空", () => {
  // 手算：dischargeDate 可选字段，为空时不报错，admissionDate 正常取
  it("有 dischargeDate 为空的记录不报错", () => {
    const visits: VisitRecordV14[] = [
      { visitId: "V001", dept: "呼吸科", admissionDate: "2026-10-01T08:00:00Z" },
      { visitId: "V002", dept: "心内科", admissionDate: "2026-04-01T08:00:00Z", dischargeDate: "2026-04-08T10:00:00Z" },
    ];
    const result = aggregateVisitHistory(visits);
    expect(result.totalVisits).toBe(2);
    expect(result.latestAdmission).toBe("2026-10-01T08:00:00Z");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-patient-360/:patientId auth:true", () => {
    const def = (emrPatient360V14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-patient-360/:patientId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
