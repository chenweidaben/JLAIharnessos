/**
 * 健澜科技 jlmedaios - EMR 全流程 L0 国标模板种子库（聚合导出）
 *
 * 覆盖国家规范全部 43 类病历文书模板（卫医政发〔2010〕11号 + WS/T 500）：
 * 门急诊 3 / 病案首页 1 / 入院系列 4 / 病程系列 11 / 会诊 3 / 手术系列 6 /
 * 麻醉系列 3 / 出死亡系列 3 / 知情同意 7 / 医嘱护理 2。
 *
 * 所有种子 scope='national'、status='published'，由 templateResolver 纯函数
 * 叠加 L1 院级 / L2 科室级 / L3 个人级覆盖后生效。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import type { EmrSeedTemplate } from './types.js';
export type { EmrSeedTemplate, TemplateField, TemplateScope, TemplateStatus, TemplateFieldType } from './types.js';
export { national } from './types.js';

import { ADMISSION_TEMPLATES } from './admission.js';
import { ANESTHESIA_TEMPLATES } from './anesthesia.js';
import { CONSENT_TEMPLATES } from './consent.js';
import { CONSULT_TEMPLATES } from './consult.js';
import { DISCHARGE_TEMPLATES } from './discharge.js';
import { FRONT_PAGE_TEMPLATES } from './frontPage.js';
import { ORDER_NURSING_TEMPLATES } from './orderNursing.js';
import { OUTPATIENT_TEMPLATES } from './outpatient.js';
import { PROGRESS_TEMPLATES } from './progress.js';
import { SURGERY_TEMPLATES } from './surgery.js';

/** 全部 L0 国标种子模板（按类别聚合） */
export const NATIONAL_TEMPLATES: EmrSeedTemplate[] = [
  ...OUTPATIENT_TEMPLATES,
  ...FRONT_PAGE_TEMPLATES,
  ...ADMISSION_TEMPLATES,
  ...PROGRESS_TEMPLATES,
  ...CONSULT_TEMPLATES,
  ...SURGERY_TEMPLATES,
  ...ANESTHESIA_TEMPLATES,
  ...DISCHARGE_TEMPLATES,
  ...CONSENT_TEMPLATES,
  ...ORDER_NURSING_TEMPLATES,
];

/** 按 templateId 索引（O(1) 查找） */
export const NATIONAL_TEMPLATE_BY_ID: ReadonlyMap<string, EmrSeedTemplate> = new Map(
  NATIONAL_TEMPLATES.map((t) => [t.templateId, t]),
);
