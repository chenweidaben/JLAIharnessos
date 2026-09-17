/**
 * 健澜科技数智医院智能体 - BFF 患者路由（聚合患者360）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { aggregatePatient360, aggregatePatientList } from '../aggregators/patient360Aggregator';
import { type Ctx, ErrorCode, fail, json, ok, type RouteDef } from '../types';

export const patientRoutes: RouteDef[] = [
  {
    method: 'GET',
    path: '/api/v1/patients',
    handle: () => {
      // 前端 fetchPatients 期望 data 直接为 Patient[]（客户端分页），
      // 因此此处直接返回数组而非 {list,total} 分页对象。
      const list = aggregatePatientList();
      return json(ok(list));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patients/:id',
    handle: (c: Ctx) => {
      const data = aggregatePatient360(c.params.id);
      if (!data) return json(fail(ErrorCode.NOT_FOUND, '患者不存在'), 404);
      return json(ok(data.patient));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patients/:id/360',
    handle: (c: Ctx) => {
      const data = aggregatePatient360(c.params.id);
      if (!data) return json(fail(ErrorCode.NOT_FOUND, '患者不存在'), 404);
      return json(ok(data));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patients/:id/vitals',
    handle: (c: Ctx) => {
      const data = aggregatePatient360(c.params.id);
      return json(ok(data?.vitalSigns ?? []));
    },
    auth: true,
  },
  {
    method: 'GET',
    path: '/api/v1/patients/:id/labs',
    handle: (c: Ctx) => {
      const data = aggregatePatient360(c.params.id);
      return json(ok(data?.labResults ?? []));
    },
    auth: true,
  },
];
