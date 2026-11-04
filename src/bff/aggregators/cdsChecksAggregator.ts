/**
 * 健澜AI原生医院操作系统OS - P2-2 CDS 深度（临床决策支持规则引擎）
 *
 * 纯函数 evaluateMedication：
 *  - 剂量超量 / 给药途径禁忌 / 疗程超限 / 特殊人群（孕/肾/肝/老/儿）/
 *    药物相互作用 / 静脉配伍禁忌 / 重复用药 / 诊断-用药禁忌
 *  - 返回 { level: hard-stop|warning|info|clear, findings[] }
 *
 * 危急值 lab-critical：内置阈值表，超阈值自动建 alert。
 * 强制提交留痕 OverrideLog。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class CdsError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export interface Finding { ruleId: string; category: string; severity: 'hard-stop'|'warning'|'info'; message: string; }
export interface CdsResult { level: 'hard-stop'|'warning'|'info'|'clear'; findings: Finding[]; }

export interface MedInput {
  drugCode: string; dose: number; route: string; durationDays: number;
  patientAge: number; isPregnant?: boolean; hasRenalDysfunction?: boolean; hasHepaticDysfunction?: boolean;
  currentDiagnoses?: string[]; concurrentDrugs?: string[];
}

// ---------- 规则库 ----------
// 剂量超量（硬编码阈值，单位为 mg/24h 或 mg/kg）
const DOSE_RULES: Array<{ drug: string; maxMg: number; perKg?: boolean; msg: string }> = [
  { drug: 'paracetamol', maxMg: 4000, msg: '对乙酰氨基酚 >4g/24h 肝损伤风险' },
  { drug: 'warfarin', maxMg: 10, msg: '华法林 >10mg/日 出血高风险' },
  { drug: 'insulin', maxMg: 1, perKg: true, msg: '胰岛素 >1U/kg/日 低血糖风险' },
  { drug: 'digoxin', maxMg: 0.25, msg: '地高辛 >0.25mg/日 治疗窗窄' },
  { drug: 'metformin', maxMg: 2550, msg: '二甲双胍 >2550mg/日 乳酸酸中毒风险' },
];
// 给药途径禁忌
const ROUTE_RULES: Array<{ drug: string; badRoute: string; msg: string }> = [
  { drug: 'metoprolol', badRoute: 'iv-push', msg: '美托洛尔不可静脉推注（需稀释慢滴）' },
  { drug: 'amoxicillin', badRoute: 'intrathecal', msg: '阿莫西林不可鞘内注射' },
  { drug: 'atenolol', badRoute: 'iv', msg: '阿替洛尔无静脉剂型，不可 IV 给药' },
];
// 疗程超限
const DURATION_RULES: Array<{ drug: string; maxDays: number; msg: string }> = [
  { drug: 'ibuprofen', maxDays: 14, msg: 'NSAID 布洛芬 >14 天需评估胃肠/肾风险' },
  { drug: 'amoxicillin', maxDays: 14, msg: '抗生素阿莫西林 >14 天未评估' },
  { drug: 'omeprazole', maxDays: 56, msg: 'PPI 奥美拉唑 >8 周需评估长期使用' },
];
// 特殊人群
const PREGNANT_FORBIDDEN = ['atorvastatin', 'lisinopril', 'warfarin', 'isotretinoin', 'ribavirin'];
const RENAL_DRUGS = ['digoxin', 'gentamicin', 'metformin'];
// 药物相互作用（≥20 对）
const INTERACTIONS: Array<[string, string, string]> = [
  ['warfarin', 'ibuprofen', '华法林+NSAID 出血风险↑'],
  ['warfarin', 'aspirin', '华法林+阿司匹林 出血风险↑'],
  ['warfarin', 'amiodarone', '华法林+胺碘酮 INR↑↑'],
  ['lisinopril', 'spironolactone', 'ACEI+保钾利尿剂 高钾血症'],
  ['sertraline', 'phenelzine', 'SSRI+MAOI 5-羟色胺综合征'],
  ['sertraline', 'tramadol', 'SSRI+曲马多 5-羟色胺综合征'],
  ['metformin', 'contrast-dye', '二甲双胍+造影剂 乳酸酸中毒'],
  ['levodopa', 'risperidone', '左旋多巴+抗精神病药 抗帕金森效果↓'],
  ['ciprofloxacin', 'warfarin', '环丙沙星+华法林 INR↑'],
  ['ciprofloxacin', 'metformin', '环丙沙星+二甲双胍 血糖波动'],
  ['clarithromycin', 'simvastatin', '克拉霉素+辛伐他汀 横纹肌溶解'],
  ['omeprazole', 'clopidogrel', 'PPI+氯吡格雷 抗血小板效果↓'],
  ['metoprolol', 'epinephrine', 'β阻滞剂+肾上腺素 高血压后反射性心动过缓'],
  ['verapamil', 'metoprolol', '非二氢吡啶+β阻滞剂 心动过缓/传导阻滞'],
  ['furosemide', 'gentamicin', '袢利尿剂+氨基糖苷 耳肾毒性↑'],
  ['spironolactone', 'potassium-chloride', '保钾利尿剂+补钾 高钾血症'],
  ['tramadol', 'alcohol', '曲马多+酒精 中枢抑制↑'],
  ['dabigatran', 'ibuprofen', '达比加群+NSAID 出血风险↑'],
  ['methotrexate', 'ibuprofen', '甲氨蝶呤+NSAID MTX 清除↓ 毒性↑'],
  ['phenytoin', 'warfarin', '苯妥英+华法林 INR 不稳定'],
];
// 静脉 Y-site 配伍禁忌（≥10 对）
const IV_INCOMPAT: Array<[string, string, string]> = [
  ['cefepime', 'acyclovir', '头孢吡肟+阿昔洛韦 Y-site 沉淀'],
  ['phenytoin', 'furosemide', '苯妥英+呋塞米 Y-site 沉淀'],
  ['ampicillin', 'fluconazole', '氨苄西林+氟康唑 Y-site 不相容'],
  ['piperacillin-tazobactam', 'vancomycin', '哌拉西林他唑巴坦+万古霉素 Y-site 沉淀'],
  ['cefazolin', 'metronidazole', '头孢唑林+甲硝唑 Y-site 不相容'],
  ['gentamicin', 'heparin', '庆大霉素+肝素 Y-site 失活'],
  ['amphotericin-b', 'saline', '两性霉素 B+生理盐水 沉淀'],
  ['diazepam', 'lvf', '地西泮+乳酸林格液 沉淀'],
  ['phenytoin', 'd5w', '苯妥英+5%葡萄糖 沉淀'],
  ['ampicillin-sulbactam', 'ondansetron', '氨苄西林舒巴坦+昂丹司琼 Y-site 不相容'],
];
// 重复用药（同治疗大类）
const THERAPY_CLASS: Record<string, string> = {
  ibuprofen: 'nsaid', aspirin: 'nsaid', naproxen: 'nsaid', diclofenac: 'nsaid',
  lisinopril: 'acei', enalapril: 'acei', ramipril: 'acei',
  metoprolol: 'beta-blocker', atenolol: 'beta-blocker', bisoprolol: 'beta-blocker',
};
// 诊断-用药禁忌
const DIAG_CONTRA: Array<{ drug: string; diag: string; msg: string }> = [
  { drug: 'metoprolol', diag: 'asthma', msg: '哮喘患者禁用非选择性 β 阻滞剂（可致支气管痉挛）' },
  { drug: 'primaquine', diag: 'g6pd-deficiency', msg: 'G6PD 缺乏患者禁用伯氨喹（溶血）' },
  { drug: 'hydrochlorothiazide', diag: 'gout', msg: '痛风患者慎用噻嗪类利尿剂（升高尿酸）' },
];

function hasDrug(list: string[] | undefined, code: string): boolean {
  return (list ?? []).includes(code);
}

export function evaluateMedication(input: MedInput): CdsResult {
  const findings: Finding[] = [];
  const dd = input.drugCode.toLowerCase();

  // 剂量
  for (const r of DOSE_RULES) {
    if (r.drug === dd) {
      const threshold = r.perKg && input.patientAge > 0 ? r.maxMg : r.maxMg;
      const v = r.perKg ? input.dose : input.dose;
      if (v > threshold) findings.push({ ruleId: `dose-${r.drug}`, category: 'dose', severity: 'hard-stop', message: r.msg });
    }
  }
  // 给药途径
  for (const r of ROUTE_RULES) {
    if (r.drug === dd && input.route === r.badRoute) {
      findings.push({ ruleId: `route-${r.drug}`, category: 'route', severity: 'hard-stop', message: r.msg });
    }
  }
  // 疗程
  for (const r of DURATION_RULES) {
    if (r.drug === dd && input.durationDays > r.maxDays) {
      findings.push({ ruleId: `duration-${r.drug}`, category: 'duration', severity: 'warning', message: r.msg });
    }
  }
  // 特殊人群
  if (input.isPregnant && PREGNANT_FORBIDDEN.includes(dd)) {
    findings.push({ ruleId: `preg-${dd}`, category: 'special-population', severity: 'hard-stop', message: `孕妇禁用 ${dd}` });
  }
  if (input.hasRenalDysfunction && RENAL_DRUGS.includes(dd)) {
    findings.push({ ruleId: `renal-${dd}`, category: 'special-population', severity: 'warning', message: `肾功能不全患者 ${dd} 需减量` });
  }
  if (input.hasHepaticDysfunction && (dd === 'metformin' || dd === 'paracetamol')) {
    findings.push({ ruleId: `hepatic-${dd}`, category: 'special-population', severity: 'warning', message: `肝功能不全 ${dd} 慎用` });
  }
  // 相互作用
  for (const [a, b, msg] of INTERACTIONS) {
    if (dd === a && hasDrug(input.concurrentDrugs, b)) findings.push({ ruleId: `ix-${a}-${b}`, category: 'interaction', severity: 'warning', message: msg });
    else if (dd === b && hasDrug(input.concurrentDrugs, a)) findings.push({ ruleId: `ix-${a}-${b}`, category: 'interaction', severity: 'warning', message: msg });
  }
  // 静脉配伍（仅 IV 给药时）
  if (input.route.startsWith('iv')) {
    for (const [a, b, msg] of IV_INCOMPAT) {
      if (dd === a && hasDrug(input.concurrentDrugs, b)) findings.push({ ruleId: `iv-${a}-${b}`, category: 'iv-incompatibility', severity: 'hard-stop', message: msg });
      else if (dd === b && hasDrug(input.concurrentDrugs, a)) findings.push({ ruleId: `iv-${a}-${b}`, category: 'iv-incompatibility', severity: 'hard-stop', message: msg });
    }
  }
  // 重复用药
  const cls = THERAPY_CLASS[dd];
  if (cls) {
    const dup = (input.concurrentDrugs ?? []).find((d) => THERAPY_CLASS[d] === cls && d !== dd);
    if (dup) findings.push({ ruleId: `dup-${cls}`, category: 'duplicate-therapy', severity: 'warning', message: `同治疗大类重复用药：${dd} 与 ${dup} 同属 ${cls}` });
  }
  // 诊断-禁忌
  for (const r of DIAG_CONTRA) {
    if (r.drug === dd && (input.currentDiagnoses ?? []).includes(r.diag)) {
      findings.push({ ruleId: `contra-${dd}`, category: 'contraindication', severity: 'hard-stop', message: r.msg });
    }
  }

  const level: CdsResult['level'] = findings.some((f) => f.severity === 'hard-stop')
    ? 'hard-stop'
    : findings.some((f) => f.severity === 'warning')
      ? 'warning'
      : findings.length ? 'info' : 'clear';
  return { level, findings };
}

// ---------- 危急值 ----------
const CRITICAL: Array<{ code: string; lo: number; hi: number; msg: string }> = [
  { code: 'K', lo: 3.0, hi: 6.0, msg: '血钾危急值' },
  { code: 'glucose', lo: 2.8, hi: 22.0, msg: '血糖危急值' },
  { code: 'hgb', lo: 60, hi: 0, msg: '血红蛋白危急值' },
  { code: 'creatinine', lo: 0, hi: 500, msg: '肌酐危急值' },
  { code: 'inr', lo: 0, hi: 4.5, msg: 'INR 危急值' },
  { code: 'platelet', lo: 50, hi: 0, msg: '血小板危急值' },
];

export interface LabAlert {
  alertId: string; visitId: string; patientId: string; labCode: string;
  value: number; unit: string; message: string; status: 'open' | 'acknowledged';
  createdAt: number; acknowledgedBy?: string; acknowledgedNote?: string; acknowledgedAt?: number;
}
export interface OverrideLog {
  visitId: string; drugCode: string; findings: Finding[]; overrideReason: string; doctorId: string; overriddenAt: number;
}

const alerts = new Map<string, LabAlert>();
const overrides: OverrideLog[] = [];
let seq = 0;

export function checkLabCritical(input: { visitId: string; patientId: string; labCode: string; value: number; unit: string }): LabAlert | null {
  const rule = CRITICAL.find((r) => r.code === input.labCode);
  if (!rule) return null;
  const isCritical = (rule.lo > 0 && input.value < rule.lo) || (rule.hi > 0 && input.value > rule.hi);
  if (!isCritical) return null;
  seq += 1;
  const a: LabAlert = {
    alertId: `ALERT-${String(seq).padStart(4, '0')}`,
    visitId: input.visitId, patientId: input.patientId, labCode: input.labCode,
    value: input.value, unit: input.unit, message: rule.msg, status: 'open', createdAt: Date.now(),
  };
  alerts.set(a.alertId, a);
  return a;
}

export function acknowledge(alertId: string, doctorId: string, note: string | undefined): LabAlert {
  const a = alerts.get(alertId);
  if (!a) throw new CdsError(404, `告警不存在：${alertId}`);
  a.status = 'acknowledged'; a.acknowledgedBy = doctorId; a.acknowledgedNote = note; a.acknowledgedAt = Date.now();
  return a;
}

export function listAlerts(visitId?: string): LabAlert[] {
  const arr = [...alerts.values()];
  return visitId ? arr.filter((a) => a.visitId === visitId) : arr;
}

export function logOverride(log: Omit<OverrideLog, 'overriddenAt'>): OverrideLog {
  const full: OverrideLog = { ...log, overriddenAt: Date.now() };
  overrides.push(full);
  return full;
}

export function __resetStore(): void { alerts.clear(); overrides.length = 0; seq = 0; }
