/**
 * 健澜科技 jlmedaios - 皮肤科管理 API（M777）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司. Licensed under Apache-2.0.
 */
import { get } from '../request';

export interface DermPatient {
  id: string;
  inpatientNo: string;
  patient: string;
  diagnosis: string;
  site: string;
  treatment: string;
  status: string;
  lesion: string;
  dermoscopy: string;
  records: { date: string; action: string; outcome: string }[];
  pathology: string;
}

const DEMO: DermPatient[] = [
  {
    id: 'DM-001',
    inpatientNo: 'ZY-261105',
    patient: '周患者',
    diagnosis: '寻常型银屑病',
    site: '四肢伸侧、腰骶部',
    treatment: '外用卡泊三醇 + 窄谱 UVB 光疗',
    status: '治疗中',
    lesion: '边界清楚的红色斑块，上覆银白色鳞屑，Auspitz 征阳性。',
    dermoscopy: '可见均匀分布的点状血管与白色鳞屑。',
    records: [
      { date: '2026-10-20', action: '窄谱 UVB 光疗 1 次', outcome: '红斑减轻，鳞屑减少' },
    ],
    pathology: '表皮角化过度伴角化不全，Munro 微脓肿；符合银屑病。',
  },
];

export interface DermListResult {
  items: DermPatient[];
  demo: boolean;
}

export async function fetchDermPatients(): Promise<DermListResult> {
  try {
    const res = await get<{ items: DermPatient[] }>('/clinical/derm-patients');
    return { items: res.items, demo: false };
  } catch {
    return { items: DEMO, demo: true };
  }
}
