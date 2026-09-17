/**
 * 健澜科技数智医院智能体 - 示例：患者360数据获取
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { patientApi } from '@/services/api';

export async function patient360Demo(keyword: string) {
  // 1) 关键字搜索
  const list = await patientApi.searchPatients(keyword);
  if (list.length === 0) return;

  // 2) 一次性拉取 360 全景（BFF 已聚合 HIS/EMR/LIS/PACS 并脱敏）
  const p360 = await patientApi.getPatient360(list[0].id);
  console.log('患者', p360.patient.name);
  console.log('在院生命体征条数', p360.vitalSigns.length);
  console.log('检验报告', p360.labResults.map((l) => l.reportName));
  console.log('费用合计', p360.billing.totalCost);

  // 3) 也可按需拉子资源
  // const labs = await patientApi.getLabResults(p360.patient.id);
}
