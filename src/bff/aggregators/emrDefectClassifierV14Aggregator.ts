/**
 * 健澜科技 jlmedaios - 病历缺陷自动分类 V14 聚合器（M470-C）
 *
 * 纯函数包装：classifyDefect / buildClassificationSummary。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import {
  buildClassificationSummary,
  classifyDefect,
  DEFECT_CATEGORIES_V14,
  type ClassificationResultV14,
} from "../../knowledge/emr/defectClassifierV14";

export { buildClassificationSummary, classifyDefect, DEFECT_CATEGORIES_V14 };
export type { ClassificationResultV14 };
