/**
 * 健澜科技 jlmedaios - 病历AI特殊人群用药推荐 V14 聚合器（M565-D，M565 收官）
 *
 * 纯函数：构建 AI 特殊人群用药推荐基础数据 + AI 特殊人群用药推荐 + 构建特殊人群用药推荐报告。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/** AI 特殊人群用药推荐基础数据 */
export interface AiSpecialPopulationMedRecoV14 {
  recordId: string;
  dept: string;
}

/** AI 特殊人群用药推荐输入 */
export interface AiSpecialPopulationMedRecoInputV14 {
  population: string;
  drugName: string;
}

/** AI 特殊人群用药推荐结果 */
export interface AiSpecialPopulationMedRecoResultV14 {
  recommendDrug: string;
  dosage: string;
}

/** 特殊人群用药推荐报告 */
export interface AiSpecialPopulationMedRecoReportV14 {
  recommendDrug: string;
  dosage: string;
}

/**
 * 构建 AI 特殊人群用药推荐基础数据。
 *
 * @param recordId 病历ID
 * @param dept 科室
 * @returns AI 特殊人群用药推荐基础数据
 */
export function buildAiSpecialPopulationMedReco(recordId: string, dept: string): AiSpecialPopulationMedRecoV14 {
  return { recordId, dept };
}

/**
 * AI 特殊人群用药推荐。
 * recommendDrug = population.includes('孕妇') ? '青霉素类抗生素'
 *   : population.includes('儿童') ? `儿童型${drugName}`
 *   : `老年型${drugName}`
 * dosage = population.includes('孕妇') ? '按说明书最低剂量'
 *   : population.includes('儿童') ? '按体重折算'
 *   : '减半剂量'
 *
 * @param input 特殊人群用药推荐输入（人群类型 + 药品名称）
 * @returns 特殊人群用药推荐结果（recommendDrug + dosage）
 */
export function recommendSpecialPopulationMedByAi(input: AiSpecialPopulationMedRecoInputV14): AiSpecialPopulationMedRecoResultV14 {
  // 手算：recommendDrug = population.includes('孕妇') ? '青霉素类抗生素'
  //   : population.includes('儿童') ? `儿童型${drugName}` : `老年型${drugName}`
  // 测试2：population='妊娠期孕妇'.includes('孕妇')=true → '青霉素类抗生素'
  // 测试3：population='老年患者'.includes('孕妇')=false, includes('儿童')=false → `老年型布洛芬缓释胶囊`
  const recommendDrug = input.population.includes("孕妇")
    ? "青霉素类抗生素"
    : input.population.includes("儿童")
      ? `儿童型${input.drugName}`
      : `老年型${input.drugName}`;
  // 手算：dosage = population.includes('孕妇') ? '按说明书最低剂量'
  //   : population.includes('儿童') ? '按体重折算' : '减半剂量'
  // 测试2：population.includes('孕妇')=true → '按说明书最低剂量'
  // 测试3：population.includes('孕妇')=false, includes('儿童')=false → '减半剂量'
  const dosage = input.population.includes("孕妇")
    ? "按说明书最低剂量"
    : input.population.includes("儿童")
      ? "按体重折算"
      : "减半剂量";
  return { recommendDrug, dosage };
}

/**
 * 构建特殊人群用药推荐报告。
 *
 * @param result 特殊人群用药推荐结果
 * @returns 特殊人群用药推荐报告（recommendDrug + dosage 透传）
 */
export function buildAiSpecialPopulationMedRecoReport(result: AiSpecialPopulationMedRecoResultV14): AiSpecialPopulationMedRecoReportV14 {
  // 手算：透传 recommendDrug + dosage
  // 测试4：{recommendDrug='青霉素类抗生素', dosage='按说明书最低剂量'} → 透传
  return { recommendDrug: result.recommendDrug, dosage: result.dosage };
}
