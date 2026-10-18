/**
 * 健澜科技 jlmedaios - 病历封存解封 V14 单测（M482-C）
 *
 * 测试 sealRecord 封存、unsealRecord 解封、读路由 POST auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  sealRecord,
  unsealRecord,
  type SealRecordV14,
} from "../../src/bff/aggregators/emrSealUnsealV14Aggregator";
import { emrSealUnsealV14Routes } from "../../src/bff/routes/emrSealUnsealV14";
import type { RouteDef } from "../../src/bff/types";

describe("sealRecord 封存", () => {
  // 手算：medicalRecordId='MR001', reason='医疗纠纷' → status='sealed'
  it("medicalRecordId=MR001, reason=医疗纠纷 → status=sealed", () => {
    const record: SealRecordV14 = sealRecord("MR001", "医疗纠纷");
    expect(record.medicalRecordId).toBe("MR001");
    expect(record.reason).toBe("医疗纠纷");
    expect(record.status).toBe("sealed");
  });
});

describe("unsealRecord 解封", () => {
  // 手算：sealed 记录 → status='unsealed'
  it("sealed 记录 → status=unsealed", () => {
    const sealed: SealRecordV14 = sealRecord("MR001", "医疗纠纷");
    const unsealed = unsealRecord(sealed);
    expect(unsealed.status).toBe("unsealed");
  });
});

describe("sealRecord 司法鉴定", () => {
  // 手算：reason='司法鉴定' → 正确构建
  it("reason=司法鉴定 → 正确构建", () => {
    const record: SealRecordV14 = sealRecord("MR002", "司法鉴定");
    expect(record.reason).toBe("司法鉴定");
    expect(record.status).toBe("sealed");
  });
});

describe("unsealRecord 已解封", () => {
  // 手算：unsealed 记录 → 保持 unsealed
  it("unsealed 记录 → 保持 unsealed", () => {
    const sealed: SealRecordV14 = sealRecord("MR001", "医疗纠纷");
    const firstUnseal = unsealRecord(sealed);
    const secondUnseal = unsealRecord(firstUnseal);
    expect(secondUnseal.status).toBe("unsealed");
  });
});

describe("读路由", () => {
  it("POST /api/v1/emr-seal-unseal auth:true", () => {
    const def = (emrSealUnsealV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "POST" && d.path === "/api/v1/emr-seal-unseal");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
