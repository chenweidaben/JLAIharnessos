/**
 * 健澜科技 jlmedaios - 互联网医院 V2 纯函数单测（M214-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { describe, expect, it } from 'bun:test';
import {
  assessOnlineConsultQuality,
  buildInternetHospitalReportV2,
  validateOnlinePrescription,
  type OnlineConsult,
  type OnlinePrescription,
} from '../../src/bff/aggregators/internetHospitalReportV2Aggregator';

describe('assessOnlineConsultQuality', () => {
  it('[5, 5, 4.5] → 4.83 优秀', () => {
    const consults: OnlineConsult[] = [
      { type: '图文', rated: true, rating: 5 },
      { type: '视频', rated: true, rating: 5 },
      { type: '语音', rated: true, rating: 4.5 },
    ];
    const r = assessOnlineConsultQuality(consults);
    expect(r.level).toBe('优秀');
  });

  it('[3.5, 4, 3.8] → 3.77 一般', () => {
    const consults: OnlineConsult[] = [
      { type: '图文', rated: true, rating: 3.5 },
      { type: '视频', rated: true, rating: 4 },
      { type: '语音', rated: true, rating: 3.8 },
    ];
    const r = assessOnlineConsultQuality(consults);
    expect(r.level).toBe('一般');
  });
});

describe('validateOnlinePrescription', () => {
  it('全部合规 → valid true', () => {
    const p: OnlinePrescription = { doctorCertified: true, patientVerified: true, drugApproved: true };
    const r = validateOnlinePrescription(p);
    expect(r.valid).toBe(true);
  });

  it('药品未审批 → valid false', () => {
    const p: OnlinePrescription = { doctorCertified: true, patientVerified: true, drugApproved: false };
    const r = validateOnlinePrescription(p);
    expect(r.valid).toBe(false);
  });
});

describe('buildInternetHospitalReportV2', () => {
  it('生成问诊数据', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.consult.text).toBeGreaterThan(0);
  });

  it('生成处方数据', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.prescription.online).toBeGreaterThan(0);
  });

  it('生成支付数据', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.payment.online).toBeGreaterThan(0);
  });

  it('生成建议', () => {
    const r = buildInternetHospitalReportV2('30d');
    expect(r.suggestions.length).toBeGreaterThan(0);
  });
});
