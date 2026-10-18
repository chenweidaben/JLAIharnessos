/**
 * 健澜科技 jlmedaios - DRG 入组预测 V14 聚合器（M535-C）
 *
 * 纯函数：构建 DRG 预测基础数据 + DRG 入组预测 + 构建 DRG 预测报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** DRG 预测基础数据 */
export interface DrgPredictV14 {
  recordId: string;
  mainDiagnosis: string;
}

/** DRG 预测输入 */
export interface DrgPredictInputV14 {
  mainDiagnosis: string;
  hasSurgery: boolean;
  age: number;
}

/** DRG 预测结果 */
export interface DrgPredictResultV14 {
  drgGroup: string;
  weight: number;
}

/** DRG 预测报告 */
export interface DrgPredictReportV14 {
  drgGroup: string;
  weight: number;
}

/**
 * 构建 DRG 预测基础数据。
 *
 * @param recordId 病历ID
 * @param mainDiagnosis 主诊断
 * @returns DRG 预测基础数据
 */
export function buildDrgPredict(recordId: string, mainDiagnosis: string): DrgPredictV14 {
  return { recordId, mainDiagnosis };
}

/**
 * DRG 入组预测。
 * 规则：
 *   mainDiagnosis='心肌梗死' && hasSurgery → drgGroup='FM1', weight=1.8
 *   mainDiagnosis='心肌梗死' && !hasSurgery → drgGroup='FM2', weight=1.2
 *   其他 → drgGroup='UN', weight=0.5
 *
 * @param input 预测输入（主诊断 + 是否手术 + 年龄）
 * @returns 预测结果（drgGroup + weight）
 */
export function predictDrgGroup(input: DrgPredictInputV14): DrgPredictResultV14 {
  // 手算：mainDiagnosis='心肌梗死' && hasSurgery → FM1 / 1.8
  // 测试2：mainDiagnosis='心肌梗死', hasSurgery=true → drgGroup='FM1', weight=1.8
  if (input.mainDiagnosis === "心肌梗死" && input.hasSurgery) {
    return { drgGroup: "FM1", weight: 1.8 };
  }
  // 手算：mainDiagnosis='心肌梗死' && !hasSurgery → FM2 / 1.2
  // 测试3：mainDiagnosis='心肌梗死', hasSurgery=false → drgGroup='FM2', weight=1.2
  if (input.mainDiagnosis === "心肌梗死" && !input.hasSurgery) {
    return { drgGroup: "FM2", weight: 1.2 };
  }
  // 手算：其他 → UN / 0.5
  return { drgGroup: "UN", weight: 0.5 };
}

/**
 * 构建 DRG 预测报告。
 *
 * @param result 预测结果
 * @returns 预测报告（drgGroup + weight 透传）
 */
export function buildDrgPredictReport(result: DrgPredictResultV14): DrgPredictReportV14 {
  // 手算：透传 drgGroup + weight
  // 测试4：{drgGroup='FM1', weight=1.8} → drgGroup='FM1', weight=1.8
  return { drgGroup: result.drgGroup, weight: result.weight };
}
