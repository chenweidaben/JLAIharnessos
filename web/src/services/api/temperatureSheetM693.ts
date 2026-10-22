/**
 * 健澜科技 jlmedaios - 体温单 API（M693）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface VitalsPoint {
  time: string;
  temperature: number;
  pulse: number;
  respRate: number;
  sbp: number;
  dbp: number;
}

export interface IntakeOutput {
  date: string;
  intakeMl: number;
  outputMl: number;
}

export interface TemperatureSheet {
  id: string;
  inpatientNo: string;
  patientId: string;
  admissionDate: string;
  currentTemp: number;
  currentPulse: number;
  vitals: VitalsPoint[];
  ioRecords: IntakeOutput[];
}

const DEMO: TemperatureSheet[] = [
  {
    id: 'TS-001',
    inpatientNo: 'ZY-2601',
    patientId: 'P10001',
    admissionDate: '2026-10-15',
    currentTemp: 37.2,
    currentPulse: 82,
    vitals: [
      { time: '10-22 06:00', temperature: 36.8, pulse: 78, respRate: 16, sbp: 125, dbp: 78 },
      { time: '10-22 10:00', temperature: 37.5, pulse: 88, respRate: 18, sbp: 130, dbp: 82 },
      { time: '10-22 14:00', temperature: 38.1, pulse: 96, respRate: 20, sbp: 135, dbp: 85 },
      { time: '10-22 18:00', temperature: 37.8, pulse: 90, respRate: 18, sbp: 128, dbp: 80 },
      { time: '10-22 22:00', temperature: 37.2, pulse: 82, respRate: 16, sbp: 122, dbp: 76 },
    ],
    ioRecords: [
      { date: '2026-10-21', intakeMl: 1800, outputMl: 1500 },
      { date: '2026-10-22', intakeMl: 1600, outputMl: 1400 },
    ],
  },
];

export interface SheetListResult {
  items: TemperatureSheet[];
  demo: boolean;
}

export async function fetchTemperatureSheets(): Promise<SheetListResult> {
  try {
    const res = await get<{ items: TemperatureSheet[] }>('/nurse/temperature-sheets');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
