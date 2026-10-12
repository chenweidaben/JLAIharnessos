/**
 * 健澜科技 jlmedaios - NQI 护理敏感指标采集计算（M16-B）
 *
 * 纯函数、确定性、无 I/O、无时钟依赖。业务侧从数据库取分子分母原始计数后，
 * 由本模块统一口径计算并标注数据源状态。
 *
 * 红线：无结构化数据源的指标（给药差错/非计划拔管/实际跌倒/院内压疮发生/离职）
 * 一律输出 sourceStatus='pending_manual'，分子分母不编造、不臆造数字。
 *
 * 依据：国卫办医函〔2020〕654 号 国家护理专业质控指标；
 * 《护理质量指标监测基本数据集实施指南（2022 版）》。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export type IndicatorDirection = 'lower_is_better' | 'higher_is_better';
export type SourceStatus = 'auto' | 'pending_manual';

export interface RawWindowMetrics {
  /** 开放床位数 */
  bedCount: number;
  /** 注册/在岗护士数（本病区/全院） */
  nurseCount: number;
  /** 当班护士数 */
  onDutyNurseCount: number;
  /** 在院患者数（分母口径） */
  inpatientCount: number;
  /** 压疮高风险标识条数（来自 nursing_records） */
  highPressureRiskCount: number;
  /** 跌倒高风险标识条数（来自 nursing_records） */
  highFallRiskCount: number;
  /** 排班总条数 */
  scheduledCount: number;
  /** 排班合规条数 */
  compliantScheduledCount: number;
}

export interface IndicatorResult {
  code: string;
  name: string;
  numerator: number | null;
  denominator: number | null;
  /** 计算值：百分比保留 1 位；比值保留 1 位 */
  value: number | null;
  unit: string;
  direction: IndicatorDirection;
  sourceStatus: SourceStatus;
  /** 超限/待接入说明 */
  note: string;
}

function pct(numerator: number, denominator: number): number {
  if (denominator <= 0) return 0;
  return Math.round((numerator / denominator) * 1000) / 10;
}

/**
 * 按窗口原始指标计算全部内置指标。
 * manualOverrides：人工录入补全 { indicatorCode: { numerator, denominator } }。
 */
export function computeIndicators(
  m: RawWindowMetrics,
  manualOverrides: Record<string, { numerator: number; denominator: number }>,
): IndicatorResult[] {
  const results: IndicatorResult[] = [];

  // 床护比 = 开放床位 / 护士数（1:x）
  results.push({
    code: 'NQI_BED_NURSE_RATIO', name: '床护比',
    numerator: m.bedCount, denominator: m.nurseCount,
    value: m.nurseCount > 0 ? Math.round((m.bedCount / m.nurseCount) * 10) / 10 : null,
    unit: '1:x', direction: 'higher_is_better', sourceStatus: 'auto',
    note: m.nurseCount > 0 ? '' : '护士数为 0，比值不可计算',
  });

  // 护患比 = 在院患者 / 当班护士（1:x，即每护士管床数）
  results.push({
    code: 'NQI_NURSE_PATIENT_RATIO', name: '护患比',
    numerator: m.inpatientCount, denominator: m.onDutyNurseCount,
    value: m.onDutyNurseCount > 0 ? Math.round((m.inpatientCount / m.onDutyNurseCount) * 10) / 10 : null,
    unit: '1:x', direction: 'lower_is_better', sourceStatus: 'auto',
    note: m.onDutyNurseCount > 0 ? '' : '当班护士为 0，护患比不可计算',
  });

  // 压疮高危率 = 压疮高风险数 / 在院患者数
  results.push({
    code: 'NQI_PRESSURE_HIGH_RISK', name: '压疮高危率',
    numerator: m.highPressureRiskCount, denominator: m.inpatientCount,
    value: pct(m.highPressureRiskCount, m.inpatientCount),
    unit: '%', direction: 'lower_is_better', sourceStatus: 'auto',
    note: '高危标识率，非院内压疮发生率',
  });

  // 跌倒高危率
  results.push({
    code: 'NQI_FALL_HIGH_RISK', name: '跌倒高危率',
    numerator: m.highFallRiskCount, denominator: m.inpatientCount,
    value: pct(m.highFallRiskCount, m.inpatientCount),
    unit: '%', direction: 'lower_is_better', sourceStatus: 'auto',
    note: '高危标识率，非实际跌倒发生率',
  });

  // 夜班排班合规率
  results.push({
    code: 'NQI_SHIFT_COMPLIANCE', name: '夜班排班合规率',
    numerator: m.compliantScheduledCount, denominator: m.scheduledCount,
    value: pct(m.compliantScheduledCount, m.scheduledCount),
    unit: '%', direction: 'higher_is_better', sourceStatus: 'auto',
    note: '由排班合规引擎判定',
  });

  // 待接入指标：有手工录入则采用，否则标注 pending_manual
  const pending: Array<{ code: string; name: string; unit: string; denominatorDef: string }> = [
    { code: 'NQI_PRESSURE_INJURY', name: '院内二期及以上压力性损伤发生率', unit: '%', denominatorDef: '住院患者数' },
    { code: 'NQI_FALL_INCIDENT', name: '跌倒发生率', unit: '%', denominatorDef: '住院患者数' },
    { code: 'NQI_UNPLANNED_EXTUBATION', name: '非计划拔管率', unit: '%', denominatorDef: '留置管路患者数' },
    { code: 'NQI_MED_ERROR', name: '给药差错率', unit: '%', denominatorDef: '给药总例次' },
    { code: 'NQI_NURSE_TURNOVER', name: '护士离职率', unit: '%', denominatorDef: '周期初护士数' },
  ];
  for (const p of pending) {
    const manual = manualOverrides[p.code];
    if (manual) {
      results.push({
        code: p.code, name: p.name,
        numerator: manual.numerator, denominator: manual.denominator,
        value: pct(manual.numerator, manual.denominator),
        unit: p.unit, direction: 'lower_is_better', sourceStatus: 'auto',
        note: '人工录入补全，须经人工核实后上报',
      });
    } else {
      results.push({
        code: p.code, name: p.name,
        numerator: null, denominator: null, value: null,
        unit: p.unit, direction: 'lower_is_better', sourceStatus: 'pending_manual',
        note: `暂无结构化数据源，待人工录入（分母口径：${p.denominatorDef}）`,
      });
    }
  }

  return results;
}

/** 人工录入校验：分子非负、分母非负、分子≤分母 */
export function validateManualEntry(numerator: number, denominator: number): { ok: boolean; message?: string } {
  if (!Number.isFinite(numerator) || !Number.isFinite(denominator)) {
    return { ok: false, message: '分子分母须为数字' };
  }
  if (numerator < 0 || denominator < 0) {
    return { ok: false, message: '分子分母不可为负' };
  }
  if (denominator > 0 && numerator > denominator) {
    return { ok: false, message: `分子（${numerator}）不可大于分母（${denominator}）` };
  }
  return { ok: true };
}
