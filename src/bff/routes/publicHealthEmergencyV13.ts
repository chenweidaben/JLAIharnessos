/**
 * 健澜科技 jlmedaios - 公共卫生应急 V13 路由（M324-D）
 *
 * GET /api/v1/public-health-emergency
 *
 * 权限：public-health-emergency:read。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */

import { requirePermissionCode } from "../middleware/auth.js";
import { type Ctx, json, ok, type RouteDef } from "../types.js";
import {
  computeChronicDiseaseCoverageV13,
  computeEmergencyResponseTimeV13,
  computeVaccinationCompletionRateV13,
  type ChronicPatientV13,
  type EmergencyEventV13,
  type VaccinationRecordV13,
} from "../aggregators/publicHealthEmergencyV13Aggregator.js";

const events: EmergencyEventV13[] = [
  { responseMinutes: 5 },
  { responseMinutes: 10 },
  { responseMinutes: 15 },
  { responseMinutes: 20 },
];

const vaccinations: VaccinationRecordV13[] = [
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: true },
  { isCompleted: false },
];

const chronicPatients: ChronicPatientV13[] = [
  { isManaged: true },
  { isManaged: true },
  { isManaged: true },
  { isManaged: true },
  { isManaged: false },
];

export const publicHealthEmergencyV13Routes: RouteDef[] = [
  {
    method: "GET",
    path: "/api/v1/public-health-emergency",
    auth: true,
    handle: async (c: Ctx): Promise<Response> => {
      const denied = requirePermissionCode(c, "public-health-emergency:read");
      if (denied) return denied;
      return json(ok({
        avgResponseMinutes: computeEmergencyResponseTimeV13(events),
        vaccinationCompletionRate: computeVaccinationCompletionRateV13(vaccinations),
        chronicDiseaseCoverage: computeChronicDiseaseCoverageV13(chronicPatients),
      }));
    },
  },
];
