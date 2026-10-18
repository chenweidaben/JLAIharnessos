/**
 * 健澜科技 jlmedaios - 质控培训记录 V14 单测（M503-D，M503 收官）
 *
 * 测试 buildTrainingRecord 构建、aggregateTrainingRecord 聚合、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  aggregateTrainingRecord,
  buildTrainingRecord,
  type TrainingRecordV14,
} from "../../src/bff/aggregators/emrQcTrainingRecordV14Aggregator";
import { emrQcTrainingRecordV14Routes } from "../../src/bff/routes/emrQcTrainingRecordV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildTrainingRecord 张医生", () => {
  // 手算：user='张医生', course='病历书写规范', date='2026-10-15' → 正确构建
  it("user='张医生', course='病历书写规范', date='2026-10-15' → 正确构建", () => {
    const record: TrainingRecordV14 = buildTrainingRecord("张医生", "病历书写规范", "2026-10-15");
    expect(record.user).toBe("张医生");
    expect(record.course).toBe("病历书写规范");
    expect(record.date).toBe("2026-10-15");
  });
});

describe("aggregateTrainingRecord 三条记录", () => {
  // 手算：3 条记录（张医生/课程A, 李医生/课程B, 张医生/课程B）
  // total = 3（数组长度）
  // users = 2（Set 去重：张医生+李医生）
  it("3 条记录 → total=3, users=2", () => {
    const records: TrainingRecordV14[] = [
      buildTrainingRecord("张医生", "病历书写规范", "2026-10-15"),
      buildTrainingRecord("李医生", "质控核心制度", "2026-10-16"),
      buildTrainingRecord("张医生", "质控核心制度", "2026-10-17"),
    ];
    const result = aggregateTrainingRecord(records);
    expect(result.total).toBe(3);
    expect(result.users).toBe(2);
  });
});

describe("aggregateTrainingRecord 空数组", () => {
  // 手算：空数组 → total=0, users=0
  it("空数组 → total=0, users=0", () => {
    const records: TrainingRecordV14[] = [];
    const result = aggregateTrainingRecord(records);
    expect(result.total).toBe(0);
    expect(result.users).toBe(0);
  });
});

describe("buildTrainingRecord 王护士", () => {
  // 手算：user='王护士', course='护理记录规范', date='2026-10-16' → 正确构建
  it("user='王护士', course='护理记录规范', date='2026-10-16' → 正确构建", () => {
    const record: TrainingRecordV14 = buildTrainingRecord("王护士", "护理记录规范", "2026-10-16");
    expect(record.user).toBe("王护士");
    expect(record.course).toBe("护理记录规范");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-training-record auth:true", () => {
    const def = (emrQcTrainingRecordV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-training-record");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
