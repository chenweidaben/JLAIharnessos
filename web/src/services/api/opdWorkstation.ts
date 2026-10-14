/**
 * 健澜科技 jlmedaios - 门诊医生工作站前端 API
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { get } from '../request';
import type { OpdWorkstationView } from '@/types/opdWorkstation';

const base = '/opd/workstation';

export function getOpdWorkstation(): Promise<OpdWorkstationView> {
  return get<OpdWorkstationView>(base);
}
