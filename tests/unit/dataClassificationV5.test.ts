/**
 * 健澜科技 jlmedaios - 数据分级分类与动态脱敏 V5 单测（M282-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildDataClassificationV5Report,
  checkMaskingV5,
  classifyDataV5,
  maskFieldV5,
} from "../../src/bff/aggregators/dataClassificationV5Aggregator";
import { dataClassificationV5Routes } from "../../src/bff/routes/dataClassificationV5";

describe("classifyDataV5", () => {
  it("id_card→secret级", () => {
    expect(classifyDataV5("patient", "id_card").level).toBe("secret");
  });
  it("name→sensitive级", () => {
    expect(classifyDataV5("patient", "name").level).toBe("sensitive");
  });
  it("dept→public级", () => {
    expect(classifyDataV5("patient", "dept").level).toBe("public");
  });
});

describe("maskFieldV5", () => {
  it("doctor角色敏感字段→脱敏", () => {
    expect(maskFieldV5("张三", "sensitive", "doctor")).toBe("张**");
  });
  it("admin角色secret字段→明文", () => {
    expect(maskFieldV5("110101199001011234", "secret", "admin")).toBe("110101199001011234");
  });
  it("doctor角色secret字段→***", () => {
    expect(maskFieldV5("110101199001011234", "secret", "doctor")).toBe("***");
  });
});

describe("checkMaskingV5", () => {
  it("doctor角色name未脱敏→不合规", () => {
    const r = checkMaskingV5({ name: "张三" }, "doctor");
    expect(r.compliant).toBe(false);
    expect(r.unmasked).toContain("name");
  });
  it("admin角色全部合规", () => {
    expect(checkMaskingV5({ name: "张三", id_card: "x" }, "admin").compliant).toBe(true);
  });
});

describe("buildDataClassificationV5Report", () => {
  it("统计各级字段数", () => {
    const metas = [
      classifyDataV5("p", "id_card"),
      classifyDataV5("p", "name"),
      classifyDataV5("p", "dept"),
    ];
    const r = buildDataClassificationV5Report(metas);
    expect(r.secretCount).toBe(1);
    expect(r.sensitiveCount).toBe(1);
    expect(r.publicCount).toBe(1);
  });
});

describe("dataClassificationV5Routes 写权限", () => {
  it("POST /api/v1/data-classification/mask 路由存在且 auth:true", () => {
    const post = dataClassificationV5Routes.find((r) => r.method === "POST" && r.path === "/api/v1/data-classification/mask");
    expect(post).toBeDefined();
    expect(post?.auth).toBe(true);
  });
});
