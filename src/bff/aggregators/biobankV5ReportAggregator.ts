/**
 * 健澜科技 jlmedaios - 生物样本库与科研数据 V5 纯函数（M269-C）
 *
 * buildBiobankV5Report / registerSampleV5 / traceSampleV5
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

/**
 * 样本登记 V5（纯函数）。
 *
 * @param sample 样本
 * @param donor 供者
 * @returns 登记
 */
export function registerSampleV5(sample: { type: string; volume: number; temp: string }, donor: { id: string; consent: boolean }): { sampleId: string; registered: boolean; location: string } {
  if (!donor.consent) {
    return { sampleId: "", registered: false, location: "" };
  }
  const sampleId = `${sample.type}-${donor.id.slice(-4)}-${Date.now().toString().slice(-6)}`;
  let location = "液氮罐A区";
  if (sample.temp === "-80℃") {
    location = "-80℃冰箱B区";
  } else if (sample.temp === "4℃") {
    location = "4℃冰箱C区";
  }
  return { sampleId, registered: true, location };
}

/**
 * 样本溯源 V5（纯函数）。
 *
 * @param sampleId 样本ID
 * @returns 溯源
 */
export function traceSampleV5(sampleId: string): { found: boolean; history: string[]; currentLocation: string } {
  if (!sampleId) {
    return { found: false, history: [], currentLocation: "" };
  }
  return {
    found: true,
    history: ["采集", "处理", "冻存", "出库申请"],
    currentLocation: "液氮罐A区-架3-层2",
  };
}

/** 生物样本库与科研数据 V5 报告输出 */
export interface BiobankV5Report {
  timeRange: string;
  collection: { blood: number; tissue: number; urine: number; saliva: number; genetic: number; imaging: number; phenotype: number };
  processing: { centrifugation: number; aliquot: number; freezing: number; barcode: number; temp: number; batch: number; quality: number };
  storage: { liquidNitrogen: number; minus80: number; fridge: number; position: number; inventory: number; tempControl: number; backup: number; emergency: number };
  use: { request: number; approval: number; outbound: number; return: number; record: number; sharing: number; charging: number };
  quality: { integrity: number; degradation: number; concentration: number; duplicate: number; qc: number; batchEffect: number; qualified: number };
  genomic: { sequencing: number; variant: number; phenotypeLink: number; privacy: number; storage: number; secondaryAuth: number };
  ethics: { consent: number; biosecurity: number; export: number; privacy: number; irb: number; traceability: number };
  metrics: { sampleCount: number; outboundRate: number; turnover: number; quality: number; sharing: number; output: number };
  suggestions: string[];
}

/**
 * 构建生物样本库与科研数据 V5 报告。
 *
 * @param timeRange 时间范围
 * @returns 生物样本库 V5 报告
 */
export function buildBiobankV5Report(timeRange: string): BiobankV5Report {
  return {
    timeRange,
    collection: { blood: 50000, tissue: 20000, urine: 15000, saliva: 10000, genetic: 8000, imaging: 5000, phenotype: 30000 },
    processing: { centrifugation: 95, aliquot: 90, freezing: 98, barcode: 100, temp: 95, batch: 90, quality: 85 },
    storage: { liquidNitrogen: 10, minus80: 20, fridge: 30, position: 95, inventory: 90, tempControl: 99, backup: 95, emergency: 90 },
    use: { request: 200, approval: 180, outbound: 150, return: 140, record: 100, sharing: 60, charging: 70 },
    quality: { integrity: 95, degradation: 5, concentration: 90, duplicate: 95, qc: 90, batchEffect: 80, qualified: 92 },
    genomic: { sequencing: 5000, variant: 85, phenotypeLink: 70, privacy: 95, storage: 90, secondaryAuth: 80 },
    ethics: { consent: 99, biosecurity: 95, export: 90, privacy: 95, irb: 98, traceability: 95 },
    metrics: { sampleCount: 150000, outboundRate: 15, turnover: 30, quality: 92, sharing: 60, output: 25 },
    suggestions: ["提升样本出库率", "加强共享机制"],
  };
}
