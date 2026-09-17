/**
 * 健澜科技数智医院智能体
 * Copyright (c) 2026 杭州健澜科技有限公司. All Rights Reserved.
 *
 * 通用类型定义
 */
export type ID = string;

export interface KeyValue<T = unknown> {
  key: string;
  value: T;
  label?: string;
}

export interface PageQuery {
  page: number;
  pageSize: number;
  keyword?: string;
}

export interface PageResult<T> {
  list: T[];
  total: number;
  page: number;
  pageSize: number;
}

export type MedicalLevel = 'critical' | 'abnormal' | 'normal' | 'pending';

export type Gender = 'male' | 'female' | 'unknown';

export type Status = 'active' | 'inactive' | 'pending';
