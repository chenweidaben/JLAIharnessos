/**
 * 健澜科技 jlmedaios - 门诊病历模板库 V14 单测（M523-A）
 *
 * 测试 buildOutpatientLibrary 构建模板库、searchOutpatientTemplates 搜索模板、buildOutpatientLibraryReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildOutpatientLibrary,
  buildOutpatientLibraryReport,
  searchOutpatientTemplates,
  type OutpatientTemplateItemV14,
} from "../../src/bff/aggregators/emrTemplateOutpatientLibraryV14Aggregator";
import { emrTemplateOutpatientLibraryV14Routes } from "../../src/bff/routes/emrTemplateOutpatientLibraryV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildOutpatientLibrary 构建模板库", () => {
  // 手算：category='内科门诊', totalTemplates=80 → 正确构建
  it("category='内科门诊', totalTemplates=80 → 正确构建", () => {
    const library = buildOutpatientLibrary("内科门诊", 80);
    expect(library.category).toBe("内科门诊");
    expect(library.totalTemplates).toBe(80);
  });
});

describe("searchOutpatientTemplates 单匹配", () => {
  // 手算：query='感染', templates=[{id:'T001',name='上呼吸道感染模板',dept='呼吸科'},{id:'T002',name='高血压门诊模板',dept='心内科'}]
  // 手算：T001 name='上呼吸道感染模板'含'感染'✓, T002 name='高血压门诊模板'不含'感染'✗
  // 手算：matched=[T001], count=1
  it("query='感染', templates=[{id:'T001',name='上呼吸道感染模板',dept='呼吸科'},{id:'T002',name='高血压门诊模板',dept='心内科'}] → matched 含 T001, count=1", () => {
    const templates: OutpatientTemplateItemV14[] = [
      { id: "T001", name: "上呼吸道感染模板", dept: "呼吸科" },
      { id: "T002", name: "高血压门诊模板", dept: "心内科" },
    ];
    const result = searchOutpatientTemplates("感染", templates);
    expect(result.matched).toContainEqual({ id: "T001", name: "上呼吸道感染模板" });
    expect(result.count).toBe(1);
  });
});

describe("searchOutpatientTemplates 多匹配", () => {
  // 手算：query='科', templates=[{id:'T001',name='上呼吸道感染模板',dept='呼吸科'},{id:'T002',name='高血压门诊模板',dept='心内科'}]
  // 手算：T001 dept='呼吸科'含'科'✓, T002 dept='心内科'含'科'✓
  // 手算：matched=[T001, T002], count=2
  it("query='科', templates=[{id:'T001',name='上呼吸道感染模板',dept='呼吸科'},{id:'T002',name='高血压门诊模板',dept='心内科'}] → matched 含两项, count=2", () => {
    const templates: OutpatientTemplateItemV14[] = [
      { id: "T001", name: "上呼吸道感染模板", dept: "呼吸科" },
      { id: "T002", name: "高血压门诊模板", dept: "心内科" },
    ];
    const result = searchOutpatientTemplates("科", templates);
    expect(result.matched.length).toBe(2);
    expect(result.count).toBe(2);
  });
});

describe("buildOutpatientLibraryReport 构建报告", () => {
  // 手算：matched=[{id:'T001',name:'上呼吸道感染模板'},{id:'T002',name:'高血压门诊模板'}]
  // 手算：firstTemplate = matched[0].name = '上呼吸道感染模板'
  it("{matched:[{id:'T001',name:'上呼吸道感染模板'},{id:'T002',name:'高血压门诊模板'}], count=2} → firstTemplate='上呼吸道感染模板'", () => {
    const report = buildOutpatientLibraryReport({
      matched: [
        { id: "T001", name: "上呼吸道感染模板" },
        { id: "T002", name: "高血压门诊模板" },
      ],
      count: 2,
    });
    expect(report.count).toBe(2);
    expect(report.firstTemplate).toBe("上呼吸道感染模板");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-template-outpatient-library auth:true", () => {
    const def = (emrTemplateOutpatientLibraryV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-template-outpatient-library");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
