/**
 * 健澜科技 jlmedaios - 病历脱敏输出 V14 单测（M528-B）
 *
 * 测试 buildDeidentifyOutput 构建输出、deidentifyPatientData 脱敏处理、buildDeidentifyOutputReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDeidentifyOutput,
  buildDeidentifyOutputReport,
  deidentifyPatientData,
  type DeidentifyInputV14,
} from "../../src/bff/aggregators/emrDeidentifyOutputV14Aggregator";
import { emrDeidentifyOutputV14Routes } from "../../src/bff/routes/emrDeidentifyOutputV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildDeidentifyOutput 构建输出", () => {
  // 手算：recordId='REC051', fieldCount=5 → 正确构建
  it("recordId='REC051', fieldCount=5 → 正确构建", () => {
    const output = buildDeidentifyOutput("REC051", 5);
    expect(output.recordId).toBe("REC051");
    expect(output.fieldCount).toBe(5);
  });
});

describe("deidentifyPatientData 脱敏", () => {
  // 手算：{patientName='张三丰', idCard='110101199001011234', phone='13812345678'}
  // 手算：maskedName = '张' + '***' = '张***'
  // 手算：maskedIdCard = '110101' + '********' + '1234' = '110101********1234'
  // 手算：maskedPhone = '138' + '****' + '5678' = '138****5678'
  it("{patientName='张三丰', idCard='110101199001011234', phone='13812345678'} → maskedName='张***', maskedIdCard='110101********1234', maskedPhone='138****5678'", () => {
    const input: DeidentifyInputV14 = {
      patientName: "张三丰",
      idCard: "110101199001011234",
      phone: "13812345678",
    };
    const result = deidentifyPatientData(input);
    expect(result.maskedName).toBe("张***");
    expect(result.maskedIdCard).toBe("110101********1234");
    expect(result.maskedPhone).toBe("138****5678");
  });
});

describe("deidentifyPatientData 短姓名", () => {
  // 手算：{patientName='李四', idCard='310101198505056789', phone='13987654321'}
  // 手算：maskedName = '李' + '***' = '李***'
  // 手算：maskedIdCard = '310101' + '********' + '6789' = '310101********6789'
  // 手算：maskedPhone = '139' + '****' + '4321' = '139****4321'
  it("{patientName='李四', idCard='310101198505056789', phone='13987654321'} → maskedName='李***', maskedIdCard='310101********6789', maskedPhone='139****4321'", () => {
    const input: DeidentifyInputV14 = {
      patientName: "李四",
      idCard: "310101198505056789",
      phone: "13987654321",
    };
    const result = deidentifyPatientData(input);
    expect(result.maskedName).toBe("李***");
    expect(result.maskedIdCard).toBe("310101********6789");
    expect(result.maskedPhone).toBe("139****4321");
  });
});

describe("buildDeidentifyOutputReport 构建报告", () => {
  // 手算：{maskedName:'张***', maskedIdCard:'110101********1234', maskedPhone:'138****5678'}
  // 手算：maskedCount = 3（3 字段都脱敏）
  it("{maskedName:'张***', maskedIdCard:'110101********1234', maskedPhone:'138****5678'} → maskedCount=3", () => {
    const report = buildDeidentifyOutputReport({
      maskedName: "张***",
      maskedIdCard: "110101********1234",
      maskedPhone: "138****5678",
    });
    expect(report.maskedCount).toBe(3);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-deidentify-output auth:true", () => {
    const def = (emrDeidentifyOutputV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-deidentify-output");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
