/**
 * 健澜科技 jlmedaios - 病历打印版式与套打 V14 聚合器（M466-A）
 *
 * 纯函数：生成打印版式定义 + 套打渲染。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** 打印版式字段坐标 */
export interface PrintFieldV14 {
  key: string;
  x: number;
  y: number;
}

/** 打印版式定义 */
export interface PrintLayoutV14 {
  paperSize: "A4" | "A5";
  orientation: "portrait" | "landscape";
  margins: number;
  fields: PrintFieldV14[];
}

/** 套打渲染结果 */
export interface RenderedFieldV14 {
  field: string;
  x: number;
  y: number;
  rendered: string;
}

/**
 * 生成打印版式定义（固定 A4 纵向，边距 20mm）。
 *
 * @param templateId 模板 ID（保留接口完整性，当前版式固定）
 * @returns 版式定义
 */
export function buildPrintLayout(templateId: string): PrintLayoutV14 {
  void templateId;
  return {
    paperSize: "A4",
    orientation: "portrait",
    margins: 20,
    fields: [
      { key: "patientName", x: 30, y: 40 },
      { key: "admissionDate", x: 30, y: 70 },
      { key: "diagnosis", x: 30, y: 100 },
    ],
  };
}

/**
 * 套打渲染：把 data 的值填入版式坐标。
 *
 * @param layout 打印版式
 * @param data 键值对数据
 * @returns 渲染结果列表
 */
export function renderPrintFields(layout: PrintLayoutV14, data: Record<string, string>): RenderedFieldV14[] {
  return layout.fields.map((field) => ({
    field: field.key,
    x: field.x,
    y: field.y,
    rendered: data[field.key] ?? "",
  }));
}
