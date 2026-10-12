/**
 * 健澜科技 jlmedaios - DIP 前端类型（M23-A）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
export interface PacketScore {
  id: string; packetCode: string; packetName: string; score: number; version: string;
}
export interface MonthlyPoint {
  id: string; period: string; fundPool: number; totalScore: number; pointValue: number;
}
export interface SettleResult {
  packetCode: string; score: number; period: string; pointValue: number; settleAmount: number;
}
