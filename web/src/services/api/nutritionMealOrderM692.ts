/**
 * 健澜科技 jlmedaios - 营养科膳食管理 API（M692）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type MealType = 'regular' | 'light' | 'diabetic' | 'low_salt' | 'low_fat' | 'liquid';
export type MealStatus = 'ordered' | 'delivered' | 'returned';

export interface MealOrder {
  id: string;
  inpatientNo: string;
  patientId: string;
  dept: string;
  mealType: MealType;
  specialReq: string;
  allergies: string[];
  nutritionNote: string;
  status: MealStatus;
}

export const MEAL_TYPE_META: Record<MealType, { label: string; color: string }> = {
  regular: { label: '普通膳食', color: 'default' },
  light: { label: '软食', color: 'blue' },
  diabetic: { label: '糖尿病膳食', color: 'red' },
  low_salt: { label: '低盐膳食', color: 'orange' },
  low_fat: { label: '低脂膳食', color: 'gold' },
  liquid: { label: '流质', color: 'purple' },
};

export const MEAL_STATUS_META: Record<MealStatus, { label: string; color: string }> = {
  ordered: { label: '已下单', color: 'orange' },
  delivered: { label: '已配送', color: 'green' },
  returned: { label: '已退回', color: 'red' },
};

const DEMO: MealOrder[] = [
  {
    id: 'MEAL-001',
    inpatientNo: 'ZY-2601',
    patientId: 'P10002',
    dept: '呼吸科',
    mealType: 'light',
    specialReq: '少盐，避免产气食物',
    allergies: ['海鲜'],
    nutritionNote: 'BMI 18.5，建议增加蛋白质摄入。',
    status: 'delivered',
  },
  {
    id: 'MEAL-002',
    inpatientNo: 'ZY-2605',
    patientId: 'P10005',
    dept: '心内科',
    mealType: 'diabetic',
    specialReq: '低 GI，分餐',
    allergies: ['坚果'],
    nutritionNote: 'HbA1c 7.8%，碳水化合物 180g/d。',
    status: 'ordered',
  },
  {
    id: 'MEAL-003',
    inpatientNo: 'ZY-2610',
    patientId: 'P10011',
    dept: 'ICU',
    mealType: 'liquid',
    specialReq: '鼻饲，营养液 50ml/h',
    allergies: [],
    nutritionNote: '肠内营养支持，蛋白 1.2g/kg/d。',
    status: 'ordered',
  },
];

export interface MealOrderListResult {
  items: MealOrder[];
  demo: boolean;
}

export async function fetchMealOrders(): Promise<MealOrderListResult> {
  try {
    const res = await get<{ items: MealOrder[] }>('/nutrition/meal-orders');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
