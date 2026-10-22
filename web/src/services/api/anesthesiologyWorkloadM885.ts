/**
 * 健澜科技 jlmedaios - 麻醉科管理（M885 升级字段） API
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface AnesthesiologyWorkloadM885 {
  id: string;
  date: string;
  general: number;
  neuraxial: number;
  nerveBlock: number;
  local: number;
  painClinic: number;
  status: string;
  asaBreakdown: { name: string; count: number }[];
  complications: string;
  pca: string;
  painClinicDetail: string;
  postOpMonitoring: string;
}

const DEMO: AnesthesiologyWorkloadM885[] = [
  {
    id: 'AN-885',
    date: '2026-10-22',
    general: 20,
    neuraxial: 6,
    nerveBlock: 4,
    local: 2,
    painClinic: 18,
    status: '正常运行',
    asaBreakdown: [
      { name: 'ASA Ⅰ', count: 4 },
      { name: 'ASA Ⅱ', count: 14 },
      { name: 'ASA Ⅲ', count: 12 },
      { name: 'ASA Ⅳ', count: 2 },
    ],
    complications: '麻醉并发症：喉痉挛 1 例（已缓解）；支气管痉挛 0；药物过敏 0；术后苏醒延迟 2 例（老年，已观察清醒）。',
    pca: '术后镇痛：PCIA 24 例；PCEA 6 例；镇痛有效率 92%；NRS 术后 24h 平均 2.5。',
    painClinicDetail: '疼痛门诊：慢性疼痛（腰腿痛/三叉神经痛）12 例；癌痛随访 6 例；神经阻滞治疗 8 例。',
    postOpMonitoring: '麻醉后监测：PACU 出室 Aldrete ≥9 占 93%；再入室 0 例；PONV 4 例（13%）。',
  },
];

export interface AnesthesiologyWorkloadM885Result {
  items: AnesthesiologyWorkloadM885[];
  demo: boolean;
}

export async function fetchAnesthesiologyWorkloadM885(): Promise<AnesthesiologyWorkloadM885Result> {
  try {
    const res = await get<{ items: AnesthesiologyWorkloadM885[] }>('/anesthesiology/workload');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
