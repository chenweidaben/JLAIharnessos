/**
 * 健澜科技 jlmedaios - 护理敏感指标（NQI）
 *
 * 提供护理质量指标自动采集和体温单趋势数据。
 * DEMO_MODE 下返回 mock 数据。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

/**
 * GET /api/v1/nursing/nqi
 * 护理敏感质量指标
 */
async function handleNQI(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const indicators = [
    {
      name: '跌倒发生率',
      value: '0.2%',
      target: '<0.3%',
      status: 'good',
    },
    {
      name: '压疮发生率',
      value: '0.1%',
      target: '<0.2%',
      status: 'good',
    },
    {
      name: '管路滑脱率',
      value: '0.05%',
      target: '<0.1%',
      status: 'good',
    },
    {
      name: '护士离职率',
      value: '8%',
      target: '<10%',
      status: 'good',
    },
    {
      name: '护士床位比',
      value: '1:0.4',
      target: '≥1:0.4',
      status: 'good',
    },
  ];

  const result = {
    period: '2026-Q3',
    indicators,
    totalIndicators: indicators.length,
  };

  return json(ok(result));
}

/**
 * GET /api/v1/nursing/temperature-chart/:patientId
 * 自动体温单（7 天趋势）
 */
async function handleTemperatureChart(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  const patientId = c.params?.patientId ?? 'P001';

  // DEMO 种子：7 天生命体征数据
  const days = [
    { date: '2026-10-12', temperature: 36.5, pulse: 78, respiration: 18, systolic: 120, diastolic: 80 },
    { date: '2026-10-13', temperature: 36.8, pulse: 82, respiration: 19, systolic: 125, diastolic: 82 },
    { date: '2026-10-14', temperature: 37.2, pulse: 85, respiration: 20, systolic: 130, diastolic: 85 },
    { date: '2026-10-15', temperature: 37.5, pulse: 88, respiration: 21, systolic: 135, diastolic: 88 },
    { date: '2026-10-16', temperature: 37.0, pulse: 80, respiration: 19, systolic: 128, diastolic: 84 },
    { date: '2026-10-17', temperature: 36.8, pulse: 76, respiration: 18, systolic: 122, diastolic: 80 },
    { date: '2026-10-18', temperature: 36.5, pulse: 74, respiration: 17, systolic: 118, diastolic: 78 },
  ];

  const result = {
    patientId,
    days,
    totalDays: days.length,
  };

  return json(ok(result));
}

export const nursingRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/nursing/nqi',
    handle: handleNQI,
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/nursing/temperature-chart/:patientId',
    handle: handleTemperatureChart,
    auth: true,
  },
];
