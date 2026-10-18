/**
 * 健澜科技 jlmedaios - 病历电子签名与认证 V14 单测（M463-A）
 *
 * 测试 signNote 含 authorId、含 noteHash 前8位、verifySignature 正确→true、篡改→false、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  signNote,
  verifySignature,
} from "../../src/bff/aggregators/emrSignatureV14Aggregator";
import { emrSignatureV14Routes } from "../../src/bff/routes/emrSignatureV14";
import type { RouteDef } from "../../src/bff/types";

const AUTHOR_ID = "doc001";
const NOTE_HASH = "abc12345def67890";

describe("signNote 含 authorId", () => {
  // 手算：SIG-doc001-abc12345，含 "doc001"
  it("输出含 authorId", () => {
    const sig = signNote(AUTHOR_ID, NOTE_HASH);
    expect(sig).toContain("doc001");
  });
});

describe("signNote 含 noteHash 前8位", () => {
  // 手算：SIG-doc001-abc12345，含 "abc12345"（noteHash 前 8 位）
  it("输出含 noteHash 前 8 位", () => {
    const sig = signNote(AUTHOR_ID, NOTE_HASH);
    expect(sig).toContain("abc12345");
  });
});

describe("verifySignature 正确签名", () => {
  // 手算：signNote(doc001, abc12345def67890) === SIG-doc001-abc12345 → true
  it("正确签名 → true", () => {
    const sig = signNote(AUTHOR_ID, NOTE_HASH);
    expect(verifySignature(sig, AUTHOR_ID, NOTE_HASH)).toBe(true);
  });
});

describe("verifySignature 篡改签名", () => {
  // 手算：SIG-doc001-tampered !== SIG-doc001-abc12345 → false
  it("篡改签名 → false", () => {
    expect(verifySignature("SIG-doc001-tampered", AUTHOR_ID, NOTE_HASH)).toBe(false);
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-signature/:noteId auth:true", () => {
    const def = (emrSignatureV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-signature/:noteId");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
