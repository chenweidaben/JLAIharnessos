/**
 * 健澜AI原生医院操作系统OS - P1-7 医嘱执行机读核对（腕带/PDA 6 级评级）
 *
 * 6 级用药安全评级（JCI/ISMP 口径）：
 *  L1 routine              常规口服
 *  L2 caution               需核对剂量
 *  L3 high-alert            高警示（高浓度电解质/肝素/胰岛素）→ 必须双人
 *  L4 look-alike-sound-alike 听似看似药            → 必须双人
 *  L5 emergency-stat        急救药/麻醉精神药      → 双人 + 停药需主任审批
 *  L6 investigational       临床试验药/毒麻精放     → 双人 + 停药需主任审批
 *
 * 状态机：created → wristband_scanned → barcode_scanned → executed
 *  任意节点可 reject（终态）/ pause（暂停）→ resume 继续；discontinue（终态，L5+ 需 approverId）。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export class MedVerifError extends Error {
  constructor(public status: number, message: string) {
    super(message);
  }
}

export type MedState =
  | 'created' | 'wristband_scanned' | 'barcode_scanned'
  | 'executed' | 'rejected' | 'paused' | 'discontinued';

export interface MedicationOrder {
  orderNo: string;
  visitId: string;
  patientId: string;
  drugName: string;
  drugCode: string;
  dose: string;
  route: string;
  scheduledAt: number;
  safetyLevel: 1 | 2 | 3 | 4 | 5 | 6;
  isHighAlert: boolean;
  state: MedState;
  wristbandScannedBy?: string;
  witnessNurseId?: string;
  barcodeScannedBy?: string;
  executedBy?: string;
  note?: string;
  rejectReason?: string;
  pauseReason?: string;
  discontinueApproverId?: string;
  createdAt: number;
}

const orders = new Map<string, MedicationOrder>();

/** 6 级评级要求矩阵：是否需双人、是否需主任审批停药。 */
export function levelRequirements(level: number): { requireDouble: boolean; requireChiefApproval: boolean; label: string } {
  switch (level) {
    case 1: return { requireDouble: false, requireChiefApproval: false, label: 'routine' };
    case 2: return { requireDouble: false, requireChiefApproval: false, label: 'caution' };
    case 3: return { requireDouble: true, requireChiefApproval: false, label: 'high-alert' };
    case 4: return { requireDouble: true, requireChiefApproval: false, label: 'look-alike-sound-alike' };
    case 5: return { requireDouble: true, requireChiefApproval: true, label: 'emergency-stat' };
    case 6: return { requireDouble: true, requireChiefApproval: true, label: 'investigational' };
    default: throw new MedVerifError(400, `非法 safetyLevel：${level}`);
  }
}

function mustOrder(orderNo: string): MedicationOrder {
  const o = orders.get(orderNo);
  if (!o) throw new MedVerifError(404, `医嘱不存在：${orderNo}`);
  return o;
}

function assertNurse(roles: string[]): void {
  if (!roles.includes('nurse') && !roles.includes('admin')) {
    throw new MedVerifError(403, '执行核对需护士/admin');
  }
}

// ---------- 创建 ----------
export interface CreateInput { visitId: string; patientId: string; orderNo: string; drugName: string; drugCode: string; dose: string; route: string; scheduledAt: number; safetyLevel: 1|2|3|4|5|6; isHighAlert: boolean; roles: string[]; }
export function createOrder(input: CreateInput): MedicationOrder {
  if (!input.roles.includes('doctor') && !input.roles.includes('admin')) {
    throw new MedVerifError(403, '创建待执行医嘱需医生/admin');
  }
  if (!input.orderNo || orders.has(input.orderNo)) throw new MedVerifError(409, `医嘱号冲突：${input.orderNo}`);
  levelRequirements(input.safetyLevel); // 校验级别合法
  const o: MedicationOrder = {
    orderNo: input.orderNo, visitId: input.visitId, patientId: input.patientId,
    drugName: input.drugName, drugCode: input.drugCode, dose: input.dose, route: input.route,
    scheduledAt: input.scheduledAt, safetyLevel: input.safetyLevel, isHighAlert: input.isHighAlert,
    state: 'created', createdAt: Date.now(),
  };
  orders.set(o.orderNo, o);
  return o;
}

// ---------- 扫腕带 ----------
export function scanWristband(orderNo: string, patientIdScanned: string, nurseId: string, witnessNurseId: string | undefined, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (o.state === 'executed' || o.state === 'rejected' || o.state === 'discontinued') {
    throw new MedVerifError(409, `终态 ${o.state} 不可再扫腕带`);
  }
  if (patientIdScanned !== o.patientId) {
    throw new MedVerifError(403, `腕带不匹配：扫到 ${patientIdScanned}，医嘱属 ${o.patientId}`);
  }
  const req = levelRequirements(o.safetyLevel);
  if (req.requireDouble) {
    if (!witnessNurseId) throw new MedVerifError(400, `L${o.safetyLevel} 高警级医嘱必须双人工号核对（缺 witnessNurseId）`);
    if (witnessNurseId === nurseId) throw new MedVerifError(400, '双工号不能为同一人');
  }
  o.state = 'wristband_scanned';
  o.wristbandScannedBy = nurseId;
  o.witnessNurseId = witnessNurseId;
  return o;
}

// ---------- 扫药品条码 ----------
export function scanBarcode(orderNo: string, drugCodeScanned: string, nurseId: string, witnessNurseId: string | undefined, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (o.state !== 'wristband_scanned' && o.state !== 'paused') {
    throw new MedVerifError(409, `需先扫腕带（当前 ${o.state}）`);
  }
  const req = levelRequirements(o.safetyLevel);
  if (req.requireDouble) {
    if (!witnessNurseId) throw new MedVerifError(400, `L${o.safetyLevel} 高警级医嘱必须双人工号核对（缺 witnessNurseId）`);
    if (witnessNurseId === nurseId) throw new MedVerifError(400, '双工号不能为同一人');
  }
  if (drugCodeScanned !== o.drugCode) {
    // 药品不符：业务语义 422
    const err = new MedVerifError(422, `药品条码不符：扫到 ${drugCodeScanned}，医嘱要求 ${o.drugCode}`);
    throw err;
  }
  o.state = 'barcode_scanned';
  o.barcodeScannedBy = nurseId;
  if (witnessNurseId) o.witnessNurseId = witnessNurseId;
  return o;
}

// ---------- 执行 ----------
export function execute(orderNo: string, nurseId: string, note: string | undefined, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (!o.wristbandScannedBy) throw new MedVerifError(409, '未扫腕带不可执行');
  if (!o.barcodeScannedBy) throw new MedVerifError(409, '未扫药品条码不可执行');
  if (o.state === 'executed') throw new MedVerifError(409, '已执行（重复执行）');
  o.state = 'executed';
  o.executedBy = nurseId;
  o.note = note;
  return o;
}

// ---------- 拒接/暂停/恢复/停药 ----------
export function rejectOrder(orderNo: string, nurseId: string, reason: string, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (o.state === 'executed' || o.state === 'discontinued' || o.state === 'rejected') {
    throw new MedVerifError(409, `终态 ${o.state} 不可拒接`);
  }
  o.state = 'rejected'; o.rejectReason = reason;
  return o;
}

export function pauseOrder(orderNo: string, nurseId: string, reason: string, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (o.state === 'executed' || o.state === 'rejected' || o.state === 'discontinued') {
    throw new MedVerifError(409, `终态 ${o.state} 不可暂停`);
  }
  o.state = 'paused'; o.pauseReason = reason;
  return o;
}

export function resumeOrder(orderNo: string, nurseId: string, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (o.state !== 'paused') throw new MedVerifError(409, `仅 paused 可恢复（当前 ${o.state}）`);
  // 回到暂停前最近完成的扫描节点
  o.state = o.barcodeScannedBy ? 'barcode_scanned' : o.wristbandScannedBy ? 'wristband_scanned' : 'created';
  return o;
}

export function discontinueOrder(orderNo: string, nurseId: string, approverId: string | undefined, roles: string[]): MedicationOrder {
  assertNurse(roles);
  const o = mustOrder(orderNo);
  if (o.state === 'executed' || o.state === 'rejected' || o.state === 'discontinued') {
    throw new MedVerifError(409, `终态 ${o.state} 不可停药`);
  }
  const req = levelRequirements(o.safetyLevel);
  if (req.requireChiefApproval && !approverId) {
    throw new MedVerifError(400, `L${o.safetyLevel} 急救/试验/毒麻精放类医嘱停药需主任审批 approverId`);
  }
  o.state = 'discontinued';
  o.discontinueApproverId = approverId;
  return o;
}

export function listOrders(visitId?: string): MedicationOrder[] {
  const arr = [...orders.values()];
  return visitId ? arr.filter((o) => o.visitId === visitId) : arr;
}

export function __resetStore(): void { orders.clear(); }
