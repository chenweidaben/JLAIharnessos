/**
 * 健澜科技 jlmedaios - 月度结算报表 API（M23-C）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { SummaryRow } from '@/types/settlementReport';

const base = '/settlement-report';

export function list() { return get<SummaryRow[]>(base); }
export function compute(period: string) { return get<SummaryRow>(`${base}/summary?period=${period}`); }
export function getOne(period: string) { return get<SummaryRow>(`${base}/${period}`); }
export function exportCsvUrl(period: string) { return `${base}/${period}/export.csv`; }
