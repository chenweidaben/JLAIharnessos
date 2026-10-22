/**
 * 健澜科技 jlmedaios - 消毒供应中心 API（M689）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export type CswdStage = 'collected' | 'washed' | 'packed' | 'sterilized' | 'issued';

export interface CswdItem {
  id: string;
  packName: string;
  lotNo: string;
  stage: CswdStage;
  sterilizer: string;
  sterilizedAt: string;
  validUntil: string;
  operator: string;
}

export const CSWD_STAGE_META: Record<CswdStage, { label: string; color: string }> = {
  collected: { label: '已回收', color: 'default' },
  washed: { label: '已清洗', color: 'blue' },
  packed: { label: '已包装', color: 'cyan' },
  sterilized: { label: '已灭菌', color: 'green' },
  issued: { label: '已发放', color: 'purple' },
};

const DEMO: CswdItem[] = [
  {
    id: 'CSWD-001',
    packName: '腹腔镜器械包',
    lotNo: 'ST-2610001',
    stage: 'sterilized',
    sterilizer: '脉动真空灭菌器 #2',
    sterilizedAt: '2026-10-22T08:00:00+08:00',
    validUntil: '2026-11-05',
    operator: '周护士',
  },
  {
    id: 'CSWD-002',
    packName: '剖宫产器械包',
    lotNo: 'ST-2610002',
    stage: 'packed',
    sterilizer: '—',
    sterilizedAt: '',
    validUntil: '',
    operator: '吴护士',
  },
  {
    id: 'CSWD-003',
    packName: '骨科器械包',
    lotNo: 'ST-260929',
    stage: 'issued',
    sterilizer: '脉动真空灭菌器 #1',
    sterilizedAt: '2026-10-20T14:00:00+08:00',
    validUntil: '2026-11-03',
    operator: '郑护士',
  },
];

export interface ItemListResult {
  items: CswdItem[];
  demo: boolean;
}

export async function fetchCswdItems(): Promise<ItemListResult> {
  try {
    const res = await get<{ items: CswdItem[] }>('/cswd/items');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
