/**
 * 健澜科技 jlmedaios - 护理出入量前端 utils（M17-E）
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import type { IoCategory, Shift } from '@/types/nursingIo';

const CAT: Record<IoCategory, string> = {
  oral: '口服',
  tube_feed: '鼻饲/肠内',
  iv: '静脉输液',
  blood_product: '血制品',
  urine: '尿液',
  stool: '粪便',
  drain: '引流',
  vomit: '呕吐',
  sweat: '出汗',
  other: '其他',
};

export function categoryLabel(c: IoCategory): string {
  return CAT[c] ?? c;
}

export function shiftLabel(s: Shift): string {
  if (s === 'day') return '白班 06-14';
  if (s === 'evening') return '小夜 14-22';
  return '大夜 22-06';
}

export function balanceColor(balance: number): string {
  if (balance > 500) return 'red';
  if (balance < -500) return 'blue';
  return 'green';
}
