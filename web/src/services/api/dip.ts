/**
 * 健澜科技 jlmedaios - DIP API（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get, post } from '../request';
import type { MonthlyPoint, PacketScore, SettleResult } from '@/types/dip';

const base = '/dip';

export function listPackets() { return get<PacketScore[]>(`${base}/packets`); }
export function createPacket(body: Record<string, unknown>) { return post<PacketScore>(`${base}/packets`, body); }
export function listPoints() { return get<MonthlyPoint[]>(`${base}/points`); }
export function calculatePoint(body: Record<string, unknown>) { return post<MonthlyPoint>(`${base}/points/calculate`, body); }
export function settle(body: Record<string, unknown>) { return post<SettleResult>(`${base}/settle`, body); }
