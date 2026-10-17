/**
 * 健澜科技 jlmedaios - 数据分级分类与动态脱敏 V5 纯函数（M282-A）
 *
 * classifyDataV5 / maskFieldV5 / checkMaskingV5 / buildDataClassificationV5Report
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 字段分级 */
export type DataLevel = "public" | "internal" | "sensitive" | "secret";

/** 字段元数据 */
export interface FieldMeta {
  table: string;
  column: string;
  level: DataLevel;
}

/**
 * 字段分级 V5（纯函数）：按列名关键词自动分级。
 *
 * @param table 表名
 * @param column 列名
 * @returns 分级结果
 */
export function classifyDataV5(table: string, column: string): FieldMeta {
  const lower = column.toLowerCase();
  let level: DataLevel = "internal";
  if (["id_card", "身份证", "phone", "手机", "bank_card", "银行卡"].some((k) => lower.includes(k))) {
    level = "secret";
  } else if (["name", "姓名", "diagnosis", "诊断", "address", "地址"].some((k) => lower.includes(k))) {
    level = "sensitive";
  } else if (["dept", "科室", "ward", "病区"].some((k) => lower.includes(k))) {
    level = "public";
  }
  return { table, column, level };
}

/**
 * 字段脱敏 V5（纯函数）：按级别与角色返回脱敏值。
 *
 * @param value 原始值
 * @param level 分级
 * @param role 角色
 * @returns 脱敏后值
 */
export function maskFieldV5(value: string, level: DataLevel, role: string): string {
  if (level === "public") return value;
  if (level === "internal") return value;
  if (role === "admin" || role === "auditor") return value;
  if (level === "sensitive") return value.slice(0, 1) + "*".repeat(Math.max(2, value.length - 1));
  if (level === "secret") return "***";
  return value;
}

/**
 * 脱敏校验 V5（纯函数）：检查数据是否按角色脱敏。
 *
 * @param data 字段值字典
 * @param role 角色
 * @returns 未脱敏的敏感字段
 */
export function checkMaskingV5(data: Record<string, string>, role: string): { unmasked: string[]; compliant: boolean } {
  const unmasked: string[] = [];
  for (const [col, val] of Object.entries(data)) {
    const meta = classifyDataV5("", col);
    if ((meta.level === "secret" || meta.level === "sensitive") && role !== "admin" && role !== "auditor") {
      if (val !== "***" && !val.includes("*")) {
        unmasked.push(col);
      }
    }
  }
  return { unmasked, compliant: unmasked.length === 0 };
}

/** 分级看板输出 */
export interface DataClassificationV5Report {
  totalFields: number;
  secretCount: number;
  sensitiveCount: number;
  publicCount: number;
}

/**
 * 构建分级看板（纯函数）。
 *
 * @param metas 字段元数据列表
 * @returns 看板
 */
export function buildDataClassificationV5Report(metas: FieldMeta[]): DataClassificationV5Report {
  return {
    totalFields: metas.length,
    secretCount: metas.filter((m) => m.level === "secret").length,
    sensitiveCount: metas.filter((m) => m.level === "sensitive").length,
    publicCount: metas.filter((m) => m.level === "public").length,
  };
}
