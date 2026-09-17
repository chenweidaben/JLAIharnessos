/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 健澜科技. All rights reserved.
 *
 * 本文件为健澜科技专有技术文件，未经授权不得复制、传播或用于其他用途。
 *
 * 8 类科室子代理配置汇总。
 */

import type { SpecialtyConfig } from '../types';
import { emergencyConfig } from './emergency';
import { icuConfig } from './icu';
import { internalMedicineConfig } from './internal-medicine';
import { medicalTechnologyConfig } from './medical-technology';
import { obstetricsGynecologyConfig } from './obstetrics-gynecology';
import { operatingRoomConfig } from './operating-room';
import { pediatricsConfig } from './pediatrics';
import { surgeryConfig } from './surgery';

/** 全部 8 类科室子代理配置（按 agentType 索引） */
export const SPECIALTY_CONFIGS: ReadonlyMap<string, SpecialtyConfig> = new Map(
  [
    internalMedicineConfig,
    surgeryConfig,
    pediatricsConfig,
    obstetricsGynecologyConfig,
    emergencyConfig,
    icuConfig,
    operatingRoomConfig,
    medicalTechnologyConfig,
  ].map((cfg) => [cfg.agentType, cfg]),
);

/** 全部科室配置列表（供遍历） */
export const ALL_SPECIALTIES: readonly SpecialtyConfig[] = [
  internalMedicineConfig,
  surgeryConfig,
  pediatricsConfig,
  obstetricsGynecologyConfig,
  emergencyConfig,
  icuConfig,
  operatingRoomConfig,
  medicalTechnologyConfig,
];

export { emergencyConfig } from './emergency';
export { icuConfig } from './icu';
export { internalMedicineConfig } from './internal-medicine';
export { medicalTechnologyConfig } from './medical-technology';
export { obstetricsGynecologyConfig } from './obstetrics-gynecology';
export { operatingRoomConfig } from './operating-room';
export { pediatricsConfig } from './pediatrics';
export { surgeryConfig } from './surgery';
