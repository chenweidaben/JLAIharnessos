/**
 * 健澜科技 jlmedaios - 全院床位图前端 API
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { BedMapView } from '@/types/bedMap';

const base = '/bed-map';

export function getBedMap(): Promise<BedMapView> {
  return get<BedMapView>(base);
}
