/**
 * 健澜科技数智医院智能体 - RADAR 适配器模块导出
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export { RadarAdapter, type RadarJobState,type RadarJobSubmitRequest, type RadarJobSubmitResponse } from './RadarAdapter';
export {
  buildCatalog,
  buildFindings,
  catalogStats,
  classifyTier,
  RADAR_CRITICAL_KEYS,
  RADAR_DISCLAIMER,
  RADAR_MODEL,
  RADAR_MODEL_VERSION,
  RADAR_ORGAN_ORDER,
  type RadarCatalog,
  type RadarCatalogOrgan,
  type RadarFinding,
  type RadarFindingDef,
  radarPositiveThreshold,
  type RadarResult,
  type RadarResultSummary,
} from './radarData';
export { RadarMockAdapter } from './RadarMockAdapter';
