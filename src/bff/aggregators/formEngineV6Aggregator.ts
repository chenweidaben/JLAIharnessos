/**
 * 健澜科技 jlmedaios - 通用表单引擎 V6 纯函数（M288-B）
 *
 * buildFormSchemaV6 / validateFormV6 / prefillFormV6
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 表单字段定义 */
export interface FormField {
  key: string;
  label: string;
  type: "text" | "number" | "date" | "select" | "textarea";
  required: boolean;
  options?: string[];
}

/** 表单 schema 输出 */
export interface FormSchema {
  name: string;
  fields: FormField[];
  requiredKeys: string[];
  fieldCount: number;
}

/** 表单提交数据 */
export type FormData = Record<string, string | number>;

/**
 * 构建表单 schema V6（纯函数）：汇总必填字段。
 *
 * @param name 表单名
 * @param fields 字段列表
 * @returns schema
 */
export function buildFormSchemaV6(name: string, fields: FormField[]): FormSchema {
  return {
    name,
    fields,
    requiredKeys: fields.filter((f) => f.required).map((f) => f.key),
    fieldCount: fields.length,
  };
}

/**
 * 表单校验 V6（纯函数）：required 缺失即 invalid；number 类型非数字即 invalid。
 *
 * @param data 提交数据
 * @param fields 字段定义
 * @returns 校验结果
 */
export function validateFormV6(data: FormData, fields: FormField[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const f of fields) {
    const v = data[f.key];
    if (f.required && (v === undefined || v === null || v === "")) {
      errors.push(`${f.key} 必填`);
      continue;
    }
    if (f.type === "number" && v !== undefined && v !== "" && v !== null) {
      if (typeof v !== "number" && isNaN(Number(v))) {
        errors.push(`${f.key} 必须为数字`);
      }
    }
  }
  return { valid: errors.length === 0, errors };
}

/**
 * 预填表单 V6（纯函数）：按 instance 数据填值。
 *
 * @param instance 已有数据
 * @param fields 字段定义
 * @returns 预填结果
 */
export function prefillFormV6(instance: FormData, fields: FormField[]): Record<string, string | number> {
  const prefilled: Record<string, string | number> = {};
  for (const f of fields) {
    if (instance[f.key] !== undefined) {
      prefilled[f.key] = instance[f.key];
    } else if (f.type === "number") {
      prefilled[f.key] = 0;
    } else {
      prefilled[f.key] = "";
    }
  }
  return prefilled;
}
