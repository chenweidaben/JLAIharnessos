/**
 * 健澜科技 jlmedaios - M543 新标准 P0：CDS 临床决策支持深度规则引擎
 *
 * POST /api/v1/cds/checks   入参（患者用药+检验+人口学+诊断），输出 alerts[]（level/category/message/suggestion/references）
 *
 * 内存硬编码规则库 ≥15 条，覆盖：
 *  - 药物相互作用：warfarin+aspirin（出血 critical）、simvastatin+clarithromycin（横纹肌溶解 warning）、metformin+碘造影（暂停 warning）
 *  - 剂量越界：warfarin>10mg/d（critical）、digoxin>0.25mg/d（warning）、高龄 digoxin 蓄积（warning）
 *  - 异常检验：k<3.5 / k>5.5 / creatinine>130 / wbc<4 / wbc>10 / platelet<100 / hgb<11
 *  - 重复医嘱：同 drugCode ≥2 次 → duplicate_order warning
 *  - 禁忌：妊娠+warfarin（critical）、高龄+NSAID（跌倒/GI warning）
 *
 * 写接口内存计算短路，绝不连 PostgreSQL；枚举英文 key、number、ISO8601，不抛 500。
 * 与 M542 /medical-records、M541 /fhir/Patient 路由区分。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

import { requireAuth } from '../middleware/auth';
import { json, ok, type Ctx, type RouteDef } from '../types';

type AlertLevel = 'info' | 'warning' | 'critical';
type AlertCategory =
  | 'drug_interaction'
  | 'dose_range'
  | 'lab_abnormal'
  | 'duplicate_order'
  | 'contraindication';

interface Medication {
  drugCode: string;
  dose: string;
  unit: string;
  frequency: string;
}

interface Labs {
  na?: number;
  k?: number;
  creatinine?: number;
  wbc?: number;
  platelet?: number;
  hgb?: number;
}

interface CheckInput {
  patientId: string;
  visitId: string;
  medications: Medication[];
  labs: Labs;
  age: number;
  weight: number;
  gender: 'male' | 'female';
  diagnoses: string[];
}

interface CdsAlert {
  level: AlertLevel;
  category: AlertCategory;
  message: string;
  suggestion: string;
  references: string[];
}

// ============================== 工具函数 ==============================

function parseDoseMed(m: Medication): number {
  const v = Number(String(m.dose).replace(/[^\d.]/g, ''));
  return Number.isFinite(v) ? v : 0;
}

function medPresent(meds: Medication[], codes: string[]): boolean {
  return meds.some((m) => codes.includes(String(m.drugCode).toLowerCase()));
}

// ============================== 规则库（≥15 条） ==============================

const NSAID_CODES = ['aspirin', 'ibuprofen', 'naproxen', 'ketorolac', 'diclofenac'];
const ACEI_ARB_CODES = ['lisinopril', 'enalapril', 'valsartan', 'losartan', 'ramipril'];

function runRules(input: CheckInput): CdsAlert[] {
  const alerts: CdsAlert[] = [];
  const meds = input.medications ?? [];
  const labs = input.labs ?? {};
  const diag = (input.diagnoses ?? []).map((d) => String(d).toLowerCase());

  // R1 warfarin + aspirin → 出血 critical
  if (medPresent(meds, ['warfarin']) && medPresent(meds, ['aspirin'])) {
    alerts.push({
      level: 'critical', category: 'drug_interaction',
      message: 'warfarin_aspirin_bleeding_risk',
      suggestion: 'avoid combination; monitor INR; consider replacing aspirin with PPI if indicated',
      references: ['ACC 2020 Anticoagulation Guideline', 'Warfarin Package Insert'],
    });
  }
  // R2 simvastatin + clarithromycin → 横纹肌溶解 warning
  if (medPresent(meds, ['simvastatin']) && medPresent(meds, ['clarithromycin'])) {
    alerts.push({
      level: 'warning', category: 'drug_interaction',
      message: 'simvastatin_clarithromycin_rhabdomyolysis',
      suggestion: 'hold simvastatin during macrolide course; switch to azithromycin if possible',
      references: ['FDA Drug Safety Communication 2011', 'ACC/AHA 2018 Cholesterol Guideline'],
    });
  }
  // R3 metformin + 碘造影 → 暂停 warning
  if (medPresent(meds, ['metformin']) && medPresent(meds, ['iodinated_contrast'])) {
    alerts.push({
      level: 'warning', category: 'drug_interaction',
      message: 'metformin_contrast_hold',
      suggestion: 'hold metformin at time of iodinated contrast; reassess 48h after renal function',
      references: ['KDIGO 2020 AKI Guideline', 'ESUR Contrast Guidelines'],
    });
  }
  // R4 ACEI/ARB + k>5.5 → warning
  if (medPresent(meds, ACEI_ARB_CODES) && typeof labs.k === 'number' && labs.k > 5.5) {
    alerts.push({
      level: 'warning', category: 'drug_interaction',
      message: 'acei_arb_hyperkalemia_risk',
      suggestion: 'hold ACEi/ARB; evaluate potassium-sparing agents; repeat BMP',
      references: ['KDIGO 2019 CKD Guideline'],
    });
  }
  // R5 warfarin >10mg/day → critical 剂量越界
  for (const m of meds) {
    if (String(m.drugCode).toLowerCase() === 'warfarin' && parseDoseMed(m) > 10) {
      alerts.push({
        level: 'critical', category: 'dose_range',
        message: 'warfarin_dose_above_10mg',
        suggestion: 'reduce warfarin dose; recheck INR within 24h',
        references: ['Chest 2016 Antithrombotic Therapy Guideline'],
      });
      break;
    }
  }
  // R6 digoxin >0.25mg/day → warning
  for (const m of meds) {
    if (String(m.drugCode).toLowerCase() === 'digoxin' && parseDoseMed(m) > 0.25) {
      alerts.push({
        level: 'warning', category: 'dose_range',
        message: 'digoxin_dose_above_0_25mg',
        suggestion: 'lower digoxin dose; check serum digoxin level and renal function',
        references: ['AHA 2019 HF Guideline', 'Digoxin Package Insert'],
      });
      break;
    }
  }
  // R7 age>75 + digoxin → warning（高龄蓄积）
  if (input.age > 75 && medPresent(meds, ['digoxin'])) {
    alerts.push({
      level: 'warning', category: 'dose_range',
      message: 'elderly_digoxin_accumulation',
      suggestion: 'consider reducing dose by 50%; monitor digoxin trough level',
      references: ['Beers Criteria 2023'],
    });
  }
  // R8 k<3.5 → warning 低钾
  if (typeof labs.k === 'number' && labs.k < 3.5) {
    alerts.push({
      level: 'warning', category: 'lab_abnormal',
      message: 'hypokalemia_k_lt_3_5',
      suggestion: 'oral/IV potassium replacement; review diuretic dose; repeat BMP',
      references: ['UpToDate Hypokalemia'],
    });
  }
  // R9 k>5.5 → critical 高钾
  if (typeof labs.k === 'number' && labs.k > 5.5) {
    alerts.push({
      level: 'critical', category: 'lab_abnormal',
      message: 'hyperkalemia_k_gt_5_5',
      suggestion: 'urgent ECG; calcium gluconate + insulin/dextrose; evaluate dialysis if refractory',
      references: ['KDIGO 2019 CKD Guideline'],
    });
  }
  // R10 creatinine>130 → warning 肾功能异常
  if (typeof labs.creatinine === 'number' && labs.creatinine > 130) {
    alerts.push({
      level: 'warning', category: 'lab_abnormal',
      message: 'renal_impairment_creatinine_gt_130',
      suggestion: 'estimate eGFR; renally adjust medications; hydrate',
      references: ['KDIGO 2019 CKD Guideline'],
    });
  }
  // R11 wbc<4 → warning
  if (typeof labs.wbc === 'number' && labs.wbc < 4) {
    alerts.push({
      level: 'warning', category: 'lab_abnormal',
      message: 'leukopenia_wbc_lt_4',
      suggestion: 'review chemotherapy/antibiotic exposure; repeat CBC with differential',
      references: ['UpToDate Neutropenia'],
    });
  }
  // R12 wbc>10 → warning
  if (typeof labs.wbc === 'number' && labs.wbc > 10) {
    alerts.push({
      level: 'warning', category: 'lab_abnormal',
      message: 'leukocytosis_wbc_gt_10',
      suggestion: 'evaluate for infection/inflammation; repeat CBC',
      references: ['UpToDate Leukocytosis'],
    });
  }
  // R13 platelet<100 → warning
  if (typeof labs.platelet === 'number' && labs.platelet < 100) {
    alerts.push({
      level: 'warning', category: 'lab_abnormal',
      message: 'thrombocytopenia_platelet_lt_100',
      suggestion: 'evaluate bleeding risk; hold anticoagulants if platelet <50; repeat CBC',
      references: ['ASH 2022 ITP Guideline'],
    });
  }
  // R14 hgb<11 → warning 贫血
  if (typeof labs.hgb === 'number' && labs.hgb < 11) {
    alerts.push({
      level: 'warning', category: 'lab_abnormal',
      message: 'anemia_hgb_lt_11',
      suggestion: 'check iron studies/B12/folate; evaluate occult bleeding',
      references: ['WHO 2023 Anemia Guideline'],
    });
  }
  // R15 同 drugCode ≥2 次 → duplicate_order warning
  const counts = new Map<string, number>();
  for (const m of meds) {
    const code = String(m.drugCode).toLowerCase();
    counts.set(code, (counts.get(code) ?? 0) + 1);
  }
  for (const [code, n] of counts) {
    if (n >= 2) {
      alerts.push({
        level: 'warning', category: 'duplicate_order',
        message: `duplicate_${code}_ordered_twice`,
        suggestion: `review duplicate ${code} entries; consolidate to a single order`,
        references: ['ISMP Medication Safety Alert'],
      });
    }
  }
  // R16 妊娠 + warfarin → critical 禁忌
  if (input.gender === 'female' && diag.includes('pregnancy') && medPresent(meds, ['warfarin'])) {
    alerts.push({
      level: 'critical', category: 'contraindication',
      message: 'pregnancy_warfarin_contraindication',
      suggestion: 'immediately stop warfarin; switch to LMWH; consult obstetrics',
      references: ['ACOG Practice Bulletin 2018', 'Warfarin Package Insert'],
    });
  }
  // R17 age>75 + NSAID → warning
  if (input.age > 75 && medPresent(meds, NSAID_CODES)) {
    alerts.push({
      level: 'warning', category: 'contraindication',
      message: 'elderly_nsaid_fall_gi_risk',
      suggestion: 'avoid chronic NSAID use in elderly; consider acetaminophen; add PPI prophylaxis',
      references: ['Beers Criteria 2023', 'AGS 2022'],
    });
  }

  return alerts;
}

// ============================== POST /api/v1/cds/checks ==============================

async function handleCdsCheck(c: Ctx): Promise<Response> {
  const denied = requireAuth(c);
  if (denied) return denied;

  let body: Record<string, unknown> | null = null;
  try {
    body = await c.body<Record<string, unknown>>();
  } catch {
    body = null;
  }
  if (!body) return json({ code: 400, message: 'invalid payload' }, 400);

  const patientId = body.patientId;
  const visitId = body.visitId;
  if (typeof patientId !== 'string' || !patientId.trim() || typeof visitId !== 'string' || !visitId.trim()) {
    return json({ code: 400, message: 'patientId and visitId are required' }, 400);
  }

  const medsRaw = Array.isArray(body.medications) ? (body.medications as Medication[]) : [];
  const meds: Medication[] = medsRaw
    .filter((m) => m && typeof m === 'object' && typeof m.drugCode === 'string')
    .map((m) => ({
      drugCode: String(m.drugCode).toLowerCase(),
      dose: String(m.dose ?? ''),
      unit: String(m.unit ?? ''),
      frequency: String(m.frequency ?? ''),
    }));

  const labsRaw = body.labs && typeof body.labs === 'object' ? (body.labs as Labs) : {};
  const labs: Labs = {};
  for (const k of ['na', 'k', 'creatinine', 'wbc', 'platelet', 'hgb'] as const) {
    const v = labsRaw[k];
    if (typeof v === 'number' && Number.isFinite(v)) labs[k] = v;
  }

  const age = Number(body.age ?? 0);
  const weight = Number(body.weight ?? 0);
  const genderRaw = body.gender === 'female' ? 'female' : 'male';
  const diagnoses = Array.isArray(body.diagnoses)
    ? (body.diagnoses as unknown[]).filter((d): d is string => typeof d === 'string')
    : [];

  const input: CheckInput = {
    patientId: patientId.trim(),
    visitId: visitId.trim(),
    medications: meds,
    labs,
    age: Number.isFinite(age) ? age : 0,
    weight: Number.isFinite(weight) ? weight : 0,
    gender: genderRaw,
    diagnoses,
  };

  const alerts = runRules(input);
  return json(
    ok({
      patientId: input.patientId,
      visitId: input.visitId,
      alerts,
      ruleCount: 17,
      checkedAt: new Date().toISOString(),
    }),
    200,
  );
}

export const m543Routes: RouteDef[] = [
  { method: 'POST', path: '/api/v1/cds/checks', handle: handleCdsCheck, auth: true },
];
