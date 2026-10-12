/**
 * 健澜科技 jlmedaios - 病组选择 API（M23-B）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { SelectionRow } from '@/types/paymentSelection';

const base = '/payment-selection';

export function list() { return get<SelectionRow[]>(base); }
export function evaluate(visitId: string, body: Record<string, unknown>) { return post<SelectionRow>(`${base}/evaluate/${visitId}`, body); }
export function getOne(visitId: string) { return get<SelectionRow>(`${base}/${visitId}`); }
export function override(visitId: string, body: Record<string, unknown>) { return post<SelectionRow>(`${base}/${visitId}/override`, body); }
