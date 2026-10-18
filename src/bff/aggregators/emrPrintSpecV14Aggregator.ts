/**
 * 健澜科技 jlmedaios - 病历打印规范 V14 聚合器（M478-C）
 *
 * 纯函数：打印规范构建 + 版式合规校验。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 打印规范 */
export interface PrintSpecV14 {
  name: string;
  paperSize: string;
  hasWatermark: boolean;
}

/** 版式校验结果 */
export interface PrintLayoutValidationV14 {
  valid: boolean;
  issues: string[];
}

/**
 * 构建打印规范。
 *
 * @param name 规范名
 * @param paperSize 纸张规格
 * @param hasWatermark 是否含水印
 * @returns 打印规范
 */
export function buildPrintSpec(name: string, paperSize: string, hasWatermark: boolean): PrintSpecV14 {
  return { name, paperSize, hasWatermark };
}

/**
 * 校验打印版式是否合规：paperSize='A4' 且 hasWatermark=true。
 *
 * @param spec 打印规范
 * @returns 版式校验结果
 */
export function validatePrintLayout(spec: PrintSpecV14): PrintLayoutValidationV14 {
  const issues: string[] = [];
  if (spec.paperSize !== "A4") {
    issues.push(`纸张规格"${spec.paperSize}"不符合规范，要求 A4`);
  }
  if (!spec.hasWatermark) {
    issues.push("缺少水印");
  }
  return { valid: issues.length === 0, issues };
}
