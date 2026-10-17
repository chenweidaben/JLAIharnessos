/**
 * 健澜科技 jlmedaios - 离任医生知识资产保留 V13 单测（M297-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  archiveDoctorKnowledgeV13,
  buildPublicKnowledgeV13,
  creditOriginalAuthorV13,
  type DoctorExpV13,
} from "../../src/bff/aggregators/publicKnowledgeV13Aggregator";
import { publicKnowledgeV13Routes } from "../../src/bff/routes/publicKnowledgeV13";

const experiences: DoctorExpV13[] = [
  { experienceId: "e-1", title: "房颤", dept: "cardio", author: "张主任", content: "华法林" },
  { experienceId: "e-2", title: "术后", dept: "surgery", author: "李医生", content: "保温" },
  { experienceId: "e-3", title: "相互作用", dept: "cardio", author: "张主任", content: "出血" },
];

describe("archiveDoctorKnowledgeV13", () => {
  it("3条→3条归档，scope=public，originalAuthor 保留", () => {
    const arch = archiveDoctorKnowledgeV13("zhang", experiences);
    expect(arch.length).toBe(3);
    expect(arch[0].scope).toBe("public");
    expect(arch[0].originalAuthor).toBe("张主任");
  });
  it("空态→0", () => {
    expect(archiveDoctorKnowledgeV13("zhang", []).length).toBe(0);
  });
});

describe("buildPublicKnowledgeV13", () => {
  it("按 dept 分组：cardio(2) surgery(1)", () => {
    const arch = archiveDoctorKnowledgeV13("zhang", experiences);
    const kb = buildPublicKnowledgeV13(arch);
    expect(kb.length).toBe(2);
    const cardio = kb.find((g) => g.dept === "cardio");
    expect(cardio?.count).toBe(2);
  });
});

describe("creditOriginalAuthorV13", () => {
  it("返回 '原作者：张主任'", () => {
    const arch = archiveDoctorKnowledgeV13("zhang", experiences);
    expect(creditOriginalAuthorV13(arch[0])).toBe("原作者：张主任");
  });
});

describe("publicKnowledgeV13Routes 写路由", () => {
  it("POST /api/v1/public-knowledge/archive/:doctorId 路由存在且 auth:true", () => {
    const route = publicKnowledgeV13Routes.find(
      (r) => r.method === "POST" && r.path === "/api/v1/public-knowledge/archive/:doctorId",
    );
    expect(route).toBeDefined();
    expect(route?.auth).toBe(true);
  });
});
