/**
 * 健澜科技 jlmedaios - 医生移动工作站聚合器（M158-B，v4.x近期）
 *
 * 三个纯函数，零 I/O、零外部依赖，结果可被前端按入参缓存：
 *  - buildMobileStaffHome(staffId, role)  按角色组装移动端首页骨架
 *      （今日待办目录 / 分管患者分组 / 医生快捷操作 / 消息通知频道）；
 *  - optimizeForMobile(pageData)           把 PC 端粗粒度页面数据裁剪/排序/
 *      去重为移动端单手可用的轻量结构（列表封顶、危急优先、字段瘦身）；
 *  - registerPushToken(staffId, token, platform)  推送令牌登记前的纯校验与
 *      去重键计算（格式白名单 + FNV-1a 稳定 dedupKey，落库由路由层完成）。
 *
 * 医疗安全：本聚合器只读、不写库、不发推送；AI 仅辅助排序与裁剪建议，
 * 医嘱/病历写操作仍走原鉴权链路。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ================================ 类型定义 ================================ */

/** 医护角色（与 BFF requireRole 角色串一致）。 */
export type StaffRole = 'doctor' | 'nurse' | 'admin' | (string & {});

/** 今日待办条目。 */
export interface StaffTodo {
  /** 稳定标识：order_review 待审医嘱 / rounds 待查房 / chart 待病历。 */
  key: 'order_review' | 'rounds' | 'chart' | string;
  /** 主文案（大字号卡片标题）。 */
  label: string;
  /** 角标数量（未读/待处理条数，纯函数默认 0）。 */
  count: number;
  /** 点击跳转的移动端路由。 */
  target: string;
  /** 是否高优（如逾期医嘱），前端用深海蓝→警示色强调。 */
  urgent?: boolean;
}

/** 移动端患者列表条目（字段已瘦身，仅保留单手列表所需）。 */
export interface MobilePatient {
  visitId: string;
  /** 脱敏姓名（张*三）。 */
  nameMasked: string;
  bedNo: string;
  /** 分组：mine 我管的 / new_today 今日新收。 */
  group: 'mine' | 'new_today';
  /** 病情等级 1~5，数值越大越重，移动端按此排序。 */
  acuity: number;
  /** 一句话提示（如「高热39.2」「术后第2天」）。 */
  hint?: string;
}

/** 医生快捷操作大按钮。 */
export interface StaffQuickAction {
  key: string;
  label: string;
  desc: string;
  icon: string;
  target: string;
}

/** 消息通知条目：危急值 / 会诊 / 审批。 */
export interface StaffNotification {
  key: string;
  /** critical_value 危急值 / consult 会诊 / approval 审批。 */
  type: 'critical_value' | 'consult' | 'approval' | string;
  title: string;
  preview: string;
  /** high 危急值红 / mid 会诊橙 / low 审批蓝。 */
  level: 'high' | 'mid' | 'low';
  time: string;
  actionTarget: string;
}

/** buildMobileStaffHome 返回的移动端首页结构。 */
export interface MobileHome {
  staffId: string;
  role: string;
  roleLabel: string;
  serverTime: string;
  /** 时段问候语（医生早晨打开即「早上好」）。 */
  greeting: string;
  todos: StaffTodo[];
  todoTotal: number;
  patientGroups: {
    mine: MobilePatient[];
    newToday: MobilePatient[];
  };
  quickActions: StaffQuickAction[];
  notifications: StaffNotification[];
  /** 移动端优化建议（与 optimizeForMobile 输出对齐，前端可直接套用）。 */
  layout: {
    columns: 1 | 2;
    largeTouchTarget: boolean;
    fontSize: 'large';
  };
}

/** registerPushToken 的校验结果。 */
export interface RegisterResult {
  staffId: string;
  platform: 'ios' | 'android' | 'web';
  /** 规范化后的令牌（去除前后空白）。 */
  deviceToken: string;
  /** 落库/续期是否被接受。 */
  status: 'registered' | 'rejected';
  /** 稳定去重键：staffId+platform+token 的 FNV-1a hex，路由层作 UPSETER 条件。 */
  dedupKey: string;
  /** 拒绝原因（status=rejected 时给出）。 */
  reason?: string;
}

/* ========================== 内部：冻结目录常量 ========================== */

/** 角色 → 工作台中文名。 */
const ROLE_LABEL: Record<string, string> = Object.freeze({
  doctor: '医生移动工作站',
  nurse: '护士移动工作站',
  admin: '管理移动视图',
});

/** 今日待办目录（所有角色通用骨架，数量由路由层后续注入）。 */
const TODO_CATALOG: readonly StaffTodo[] = Object.freeze([
  Object.freeze({ key: 'order_review', label: '待审医嘱', count: 0, target: '/m/orders?review=1' }),
  Object.freeze({ key: 'rounds', label: '待查房', count: 0, target: '/m/rounds' }),
  Object.freeze({ key: 'chart', label: '待病历', count: 0, target: '/m/charts?open=1' }),
]);

/** 医生快捷操作目录（写交班 / 下医嘱 / 开检查）。 */
const DOCTOR_QUICK_ACTIONS: readonly StaffQuickAction[] = Object.freeze([
  Object.freeze({ key: 'handover', label: '写交班', desc: 'SBAR 一键起草交班小结', icon: 'swap', target: '/m/handoff/new' }),
  Object.freeze({ key: 'new-order', label: '下医嘱', desc: '常用医嘱模板快速下达', icon: 'file-done', target: '/m/orders/new' }),
  Object.freeze({ key: 'new-exam', label: '开检查', desc: '检验/检查申请一键开具', icon: 'audit', target: '/m/exams/new' }),
]);

/** 消息通知频道骨架（危急值/会诊/审批）。 */
const NOTIFICATION_CHANNELS: readonly StaffNotification[] = Object.freeze([
  Object.freeze({ key: 'ch-critical', type: 'critical_value', title: '危急值', preview: '', level: 'high', time: '', actionTarget: '/m/notifications?type=critical_value' }),
  Object.freeze({ key: 'ch-consult', type: 'consult', title: '会诊', preview: '', level: 'mid', time: '', actionTarget: '/m/notifications?type=consult' }),
  Object.freeze({ key: 'ch-approval', type: 'approval', title: '审批', preview: '', level: 'low', time: '', actionTarget: '/m/notifications?type=approval' }),
]);

/** 允许的推送平台白名单。 */
const PLATFORMS = Object.freeze(['ios', 'android', 'web'] as const);

/* ============================ 内部：纯工具函数 =========================== */

/** 按小时给问候语（0~23）。 */
function greetingOfHour(hour: number): string {
  if (hour < 6) return '夜深了';
  if (hour < 11) return '早上好';
  if (hour < 13) return '中午好';
  if (hour < 18) return '下午好';
  return '晚上好';
}

/**
 * FNV-1a 32bit → 8 位 hex（零依赖）。
 * 用于推送令牌稳定去重：同一 staffId+platform+token 永远得到同一 dedupKey。
 */
function fnv1aHex(input: string): string {
  let hash = 0x811c9dc5;
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i);
    // 近似 32bit 乘法（FNV prime 16777619），保持 JS 内安全
    hash = Math.imul(hash, 0x01000193) >>> 0;
  }
  return hash.toString(16).padStart(8, '0');
}

/* ========================== buildMobileStaffHome ========================= */

/**
 * 组装医生移动端首页骨架（纯函数）。
 *
 * @param staffId 登录医护 ID（透传，供前端埋点与推送绑定）。
 * @param role    当前主角色；仅 doctor 下发「写交班/下医嘱/开检查」，
 *                其余角色返回统一待办骨架，不下发医生专用写操作（越权隔离）。
 *
 * 移动端+性能：结果仅取决于入参与当前时间分钟级粒度，可安全按 staffId+role
 * 缓存 60s；列表默认空、计数默认 0，路由层合并实时数据时再覆盖本结构。
 */
export function buildMobileStaffHome(staffId: string, role: StaffRole): MobileHome {
  const now = new Date();
  const isDoctor = role === 'doctor';
  return {
    staffId,
    role,
    roleLabel: ROLE_LABEL[role] ?? '移动工作台',
    serverTime: now.toISOString(),
    greeting: greetingOfHour(now.getHours()),
    todos: TODO_CATALOG.map((t) => ({ ...t })),
    todoTotal: TODO_CATALOG.reduce((s, t) => s + t.count, 0),
    patientGroups: { mine: [], newToday: [] },
    quickActions: isDoctor ? DOCTOR_QUICK_ACTIONS.map((a) => ({ ...a })) : [],
    notifications: NOTIFICATION_CHANNELS.map((n) => ({ ...n })),
    layout: { columns: 1, largeTouchTarget: true, fontSize: 'large' },
  };
}

/* ============================ optimizeForMobile ========================== */

/** 移动端优化后的输出结构。 */
export interface OptimizedData {
  patients: MobilePatient[];
  notifications: StaffNotification[];
  /** 患者/通知总量（被封顶前的真实数量，前端据此显示「还有 N 条」）。 */
  totals: { patients: number; notifications: number };
  /** 是否做了封顶截断。 */
  truncated: boolean;
}

interface RawPageData {
  patients?: Array<Partial<MobilePatient> & { visitId?: string }>;
  notifications?: Array<Partial<StaffNotification> & { key?: string }>;
}

/** 通知等级权重：危急值 > 会诊 > 审批。 */
const LEVEL_WEIGHT: Record<string, number> = Object.freeze({ high: 0, mid: 1, low: 2 });

/** 患者列表移动端封顶条数（单手屏内可扫完）。 */
const PATIENT_CAP = 20;
/** 通知列表移动端封顶条数。 */
const NOTIFICATION_CAP = 5;

/**
 * 把 PC 端粗粒度页面数据优化为移动端轻量结构（纯函数）：
 *  - 患者：按病情等级降序、同级按床号升序，封顶 20 条，丢弃缺 visitId 的脏行；
 *  - 通知：危急值优先排序，按 key 去重（同 key 保留最新），封顶 5 条；
 *  - 字段瘦身：只保留单手列表所需字段，null/undefined 不进输出。
 *
 * 「不是缩小版」的关键：PC 端列表动辄上百行，移动端必须先排序封顶再渲染，
 * 否则医生单手滚动 30 屏也找不到危急患者。
 */
export function optimizeForMobile(pageData: RawPageData): OptimizedData {
  const rawPatients = Array.isArray(pageData.patients) ? pageData.patients : [];
  const rawNotifications = Array.isArray(pageData.notifications) ? pageData.notifications : [];

  // —— 患者：过滤脏行 → 排序 → 封顶 ——
  const patients: MobilePatient[] = rawPatients
    .filter((p) => typeof p.visitId === 'string' && p.visitId.length > 0)
    .map((p) => ({
      visitId: p.visitId as string,
      nameMasked: p.nameMasked ?? '***',
      bedNo: p.bedNo ?? '-',
      group: (p.group === 'new_today' ? 'new_today' : 'mine') as MobilePatient['group'],
      acuity: typeof p.acuity === 'number' && p.acuity >= 1 ? p.acuity : 1,
      ...(p.hint ? { hint: p.hint } : {}),
    }))
    .sort((a, b) => (b.acuity - a.acuity) || a.bedNo.localeCompare(b.bedNo, 'zh-CN'));

  const truncatedPatients = patients.length > PATIENT_CAP;
  const patientsOut = truncatedPatients ? patients.slice(0, PATIENT_CAP) : patients;

  // —— 通知：按 key 去重（保留后出现的，即较新）→ 等级排序 → 封顶 ——
  const seen = new Map<string, StaffNotification>();
  for (const n of rawNotifications) {
    const key = n.key ?? `${n.type ?? 'n'}-${n.time ?? ''}`;
    seen.set(key, {
      key,
      type: n.type ?? 'approval',
      title: n.title ?? '新通知',
      preview: n.preview ?? '',
      level: n.level ?? 'low',
      time: n.time ?? '',
      actionTarget: n.actionTarget ?? '/m/notifications',
    });
  }
  const notifications: StaffNotification[] = [...seen.values()].sort(
    (a, b) =>
      (LEVEL_WEIGHT[a.level] ?? 9) - (LEVEL_WEIGHT[b.level] ?? 9) ||
      (b.time ?? '').localeCompare(a.time ?? ''),
  );
  const truncatedNotifications = notifications.length > NOTIFICATION_CAP;
  const notificationsOut = truncatedNotifications
    ? notifications.slice(0, NOTIFICATION_CAP)
    : notifications;

  return {
    patients: patientsOut,
    notifications: notificationsOut,
    totals: { patients: rawPatients.length, notifications: rawNotifications.length },
    truncated: truncatedPatients || truncatedNotifications,
  };
}

/* =========================== registerPushToken ========================== */

/**
 * 推送令牌登记前的纯校验与去重（纯函数）。
 *  - staffId 非空；
 *  - platform ∈ {ios, android, web}；
 *  - device_token 去空白后长度 8~200（APNs hex / FCM token / Web endpoint 摘要
 *    均落在此区间），字符集限定字母数字与常见分隔符，拒绝空串与明显伪造；
 *  - 校验通过即计算稳定 dedupKey，路由层据此 UPSERT clinical.mobile_session。
 *
 * 医疗安全：本函数不触达推送通道、不写库；拒绝时给出 reason，由路由层回 400。
 */
export function registerPushToken(
  staffId: string,
  deviceToken: string,
  platform: string,
): RegisterResult {
  const token = typeof deviceToken === 'string' ? deviceToken.trim() : '';
  const sid = typeof staffId === 'string' ? staffId.trim() : '';

  const reject = (reason: string, plat: string): RegisterResult => ({
    staffId: sid,
    platform: (PLATFORMS as readonly string[]).includes(plat)
      ? (plat as RegisterResult['platform'])
      : 'web',
    deviceToken: token,
    status: 'rejected',
    dedupKey: fnv1aHex(`${sid}|${plat}|${token}`),
    reason,
  });

  if (!sid) return reject('缺少 staffId', platform);
  if (!(PLATFORMS as readonly string[]).includes(platform)) {
    return reject(`不支持的推送平台：${String(platform)}`, '');
  }
  if (token.length < 8 || token.length > 200) {
    return reject('device_token 长度须在 8~200 之间', platform);
  }
  if (!/^[A-Za-z0-9\-_:/.+=]+$/.test(token)) {
    return reject('device_token 含非法字符', platform);
  }

  return {
    staffId: sid,
    platform: platform as RegisterResult['platform'],
    deviceToken: token,
    status: 'registered',
    dedupKey: fnv1aHex(`${sid}|${platform}|${token}`),
  };
}
