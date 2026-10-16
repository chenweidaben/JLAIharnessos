/**
 * 健澜科技 jlmedaios - 后勤管理纯函数（M192-D）
 *
 * buildLogisticsManagementReport / calculateEnergyEfficiency / predictLogisticsNeed
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/** 能源数据 */
export interface EnergyData {
  waterUsage: number;
  electricityUsage: number;
  gasUsage: number;
  steamUsage: number;
  buildingArea: number;
  patientVolume: number;
}

/**
 * 能源效率计算（纯函数）。
 *
 * @param data 能源数据
 * @returns 单位面积能耗 + 人均能耗
 */
export function calculateEnergyEfficiency(data: EnergyData): { perArea: number; perPatient: number; waterPerPatient: number } {
  const totalEnergy = data.electricityUsage * 0.123 + data.gasUsage * 9.8 + data.steamUsage * 0.1;
  const perArea = data.buildingArea > 0 ? Math.round((totalEnergy / data.buildingArea) * 100) / 100 : 0;
  const perPatient = data.patientVolume > 0 ? Math.round((totalEnergy / data.patientVolume) * 100) / 100 : 0;
  const waterPerPatient = data.patientVolume > 0 ? Math.round((data.waterUsage / data.patientVolume) * 10) / 10 : 0;
  return { perArea, perPatient, waterPerPatient };
}

/**
 * 后勤需求预测（纯函数）。
 *
 * @param patientVolume 门诊量
 * @returns 预测后勤人员配置
 */
export function predictLogisticsNeed(patientVolume: number): { housekeeping: number; security: number; catering: number; linen: number } {
  return {
    housekeeping: Math.ceil(patientVolume / 200),
    security: Math.ceil(patientVolume / 150),
    catering: Math.ceil(patientVolume / 100),
    linen: Math.ceil(patientVolume / 300),
  };
}

/** 后勤报告输出 */
export interface LogisticsManagementReport {
  dept: string;
  timeRange: string;
  housekeeping: { satisfaction: number; area: number };
  linen: { turnover: number; satisfaction: number };
  catering: { mealsPerDay: number; satisfaction: number };
  security: { patrols: number; incidents: number };
  energy: { water: number; electricity: number; gas: number; steam: number; perArea: number; perPatient: number };
  wastewater: { treatmentRate: number; dischargeQuality: string };
  medicalGas: { oxygenSupply: number; pipelineLeakRate: number };
  morgue: { storage: number; turnover: number };
  predictedNeed: { housekeeping: number; security: number; catering: number; linen: number };
  suggestions: string[];
}

/**
 * 构建后勤管理报告。
 *
 * @param dept 科室
 * @param timeRange 时间范围
 * @returns 后勤报告
 */
export function buildLogisticsManagementReport(dept: string, timeRange: string): LogisticsManagementReport {
  const energyData: EnergyData = {
    waterUsage: 50000,
    electricityUsage: 800000,
    gasUsage: 5000,
    steamUsage: 2000,
    buildingArea: 50000,
    patientVolume: 30000,
  };

  const energyEff = calculateEnergyEfficiency(energyData);
  const predictedNeed = predictLogisticsNeed(30000);

  const suggestions: string[] = [];
  suggestions.push('建议加强能源管理，降低单位面积能耗');
  suggestions.push('建议优化被服洗涤流程，提高周转效率');

  return {
    dept,
    timeRange,
    housekeeping: { satisfaction: 0.88, area: 50000 },
    linen: { turnover: 2.5, satisfaction: 0.85 },
    catering: { mealsPerDay: 1500, satisfaction: 0.82 },
    security: { patrols: 24, incidents: 1 },
    energy: { water: 50000, electricity: 800000, gas: 5000, steam: 2000, perArea: energyEff.perArea, perPatient: energyEff.perPatient },
    wastewater: { treatmentRate: 1.0, dischargeQuality: 'GB18466-2005 达标' },
    medicalGas: { oxygenSupply: 2000, pipelineLeakRate: 0.005 },
    morgue: { storage: 20, turnover: 8 },
    predictedNeed,
    suggestions,
  };
}
