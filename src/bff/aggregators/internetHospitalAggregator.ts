/**
 * 健澜科技 jlmedaios - 【互联网医院深化】处方流转与药品配送聚合器（M163-D）
 *
 * 业务闭环：
 *   患者预约 → 医生接诊 → 在线问诊 → 开具处方
 *     → 处方流转 routePrescriptionToPharmacy（按患者定位选最近合规药房）
 *     → 药品配送 trackDelivery（建单→打包→发货→送达/取药）
 *     → 用药随访
 *
 * 【安全与运营】合规红线（处方流转要合规，不能违规售药）：
 *   · 麻醉（narcotic）/ 精神（psychotropic）/ 医疗用毒性（toxic）/
 *     放射性（radiopharmaceutical）/ 终止妊娠（termination）/ 蛋白同化（anabolic）
 *     等特殊管理药品，互联网医院一律禁开，verifyOnlinePrescription 直接拦截；
 *   · 复诊二次方（secondTime=true）必须经药师审方通过（status='approved'）
 *     方可流转配送；未审方 / 已驳回 / 已取消一律阻断；
 *   · 承接药房须双证齐全（licensed=true）且有库存（stockReady），
 *     患者定位超出服务半径不承接；
 *   · 路由决策与合规复核结果全程留痕（见 329-internet-hospital.sql）。
 *
 * 纯函数约定：
 *   · buildOnlineConsultationFlow / routePrescriptionToPharmacy /
 *     trackDelivery / verifyOnlinePrescription 均为纯计算，
 *     不修改入参、不触库、不读时钟、不发网络请求；
 *   · 种子数据 SEED_PHARMACIES / SEED_PRESCRIPTIONS / SEED_DELIVERY_TRACKS
 *     为只读常量，供路由层回读与单测锚定；
 *   · 违规 / 入参非法一律抛错，由路由层收敛为 400/409。
 *
 * 不触碰 WebSocket，不新增依赖。
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型与口径                                                          */
/* ------------------------------------------------------------------ */

/** 问诊七步流程阶段（顺序即生命周期） */
export type ConsultationStage =
  | 'appointment'        // 患者预约
  | 'doctor_accept'      // 医生接诊
  | 'online_consult'     // 在线问诊
  | 'prescribe'          // 开具处方
  | 'prescription_route' // 处方流转
  | 'drug_delivery'      // 药品配送
  | 'followup';          // 用药随访

/** 流程中的一个步骤（含合规卡口说明） */
export interface FlowStep {
  key: ConsultationStage;
  order: number;
  title: string;
  /** 该步骤的合规卡口（安全与运营） */
  complianceGate: string;
}

/** 互联网药品交易资质类别（麻精毒放等特殊药品禁开） */
export type DrugCategory =
  | 'otc'              // 非处方药
  | 'rx'               // 普通处方药
  | 'narcotic'         // 麻醉药品（互联网禁开）
  | 'psychotropic'      // 精神药品（互联网禁开）
  | 'toxic'            // 医疗用毒性药品（互联网禁开）
  | 'radiopharmaceutical' // 放射性药品（互联网禁开）
  | 'termination'      // 终止妊娠类药品（互联网禁开）
  | 'anabolic';        // 蛋白同化制剂（互联网禁开）

/** 互联网医院禁止线上开具的特殊管理药品类别 */
export const BANNED_ONLINE_DRUG_CATEGORIES: readonly DrugCategory[] = [
  'narcotic',
  'psychotropic',
  'toxic',
  'radiopharmaceutical',
  'termination',
  'anabolic',
];

/** 禁开药品类别中文标签（阻断文案可读，安全与运营） */
const BANNED_LABEL: Record<string, string> = {
  narcotic: '麻醉药品',
  psychotropic: '精神药品',
  toxic: '医疗用毒性药品',
  radiopharmaceutical: '放射性药品',
  termination: '终止妊娠类药品',
  anabolic: '蛋白同化制剂',
};

/** 电子处方状态（与 clinical.internet_prescriptions.status 对齐） */
export type PrescriptionStatus =
  | 'pending_review'  // 待药师审方
  | 'approved'         // 审方通过（唯一可流转状态）
  | 'rejected'        // 审方驳回
  | 'returned'         // 退回医生修改
  | 'paid'             // 已支付
  | 'cancelled';       // 已取消

/** 一张待流转处方（BFF 纯函数形态，camelCase） */
export interface PrescriptionForRouting {
  id: string;
  rxNo: string;
  patientId: string;
  prescriberId: string;
  status: PrescriptionStatus;
  /** 是否复诊二次方（true 时强制药师审方通过后方可流转） */
  secondTime: boolean;
  /** 处方内含药品类别集合 */
  drugCategories: DrugCategory[];
}

/** 患者定位（经纬度 + 可选城区） */
export interface PatientLocation {
  lng: number;
  lat: number;
  district?: string;
}

/** 一家承接流转的互联网药房 */
export interface DeliveryPharmacy {
  id: string;
  name: string;
  /** 《药品经营许可证》《互联网药品信息服务资格证》双证齐全 */
  licensed: boolean;
  lng: number;
  lat: number;
  /** 服务半径（公里），患者定位超出不承接 */
  serviceRadiusKm: number;
  /** 是否有该处方库存 */
  stockReady: boolean;
  enabled: boolean;
}

/** 路由决策结果 */
export interface RouteDecision {
  prescriptionId: string;
  routed: boolean;
  pharmacyId: string | null;
  pharmacyName: string | null;
  distanceKm: number | null;
  etaMinutes: number | null;
  channel: 'self_pick' | 'express' | null;
  reason: string;
  warnings: string[];
}

/** 合规复核单条检查 */
export interface ComplianceCheck {
  name: string;
  pass: boolean;
  detail: string;
}

/** 合规复核结果（verifyOnlinePrescription） */
export interface PrescriptionVerification {
  prescriptionId: string;
  compliant: boolean;
  /** 是否需要药师审方（复诊二次方强制） */
  requiresPharmacistReview: boolean;
  checks: ComplianceCheck[];
  blockers: string[];
}

/** 配送追踪一个节点 */
export interface DeliveryTrackEvent {
  stage: 'created' | 'packed' | 'shipped' | 'delivered' | 'picked_up' | 'cancelled';
  title: string;
  at: string;
  note?: string;
}

/** 配送追踪结果（trackDelivery） */
export interface DeliveryTrack {
  prescriptionId: string;
  deliveryNo: string;
  channel: 'self_pick' | 'express';
  currentStage: DeliveryTrackEvent['stage'];
  currentTitle: string;
  courierCompany: string | null;
  trackingNo: string | null;
  etaMinutes: number | null;
  finished: boolean;
  timeline: DeliveryTrackEvent[];
}

/* ------------------------------------------------------------------ */
/* 种子数据（只读常量；路由层回读，单测锚定）                           */
/* ------------------------------------------------------------------ */

/** 承接流转的互联网药房网络（双证齐全方可参与路由） */
export const SEED_PHARMACIES: DeliveryPharmacy[] = [
  {
    id: 'PH-CITY-HQ',
    name: '健澜互联网药房·武林总店',
    licensed: true,
    lng: 120.160,
    lat: 30.280,
    serviceRadiusKm: 6.0,
    stockReady: true,
    enabled: true,
  },
  {
    id: 'PH-XIHU',
    name: '健澜互联网药房·西湖银泰店',
    licensed: true,
    lng: 120.150,
    lat: 30.255,
    serviceRadiusKm: 5.0,
    stockReady: true,
    enabled: true,
  },
  {
    id: 'PH-BINJIANG',
    name: '健澜互联网药房·滨江宝龙店',
    licensed: true,
    lng: 120.210,
    lat: 30.205,
    serviceRadiusKm: 4.0,
    stockReady: true,
    enabled: true,
  },
  {
    id: 'PH-YUHANG-UNLIC',
    name: '某无证药房·余杭（仅演示不参与路由）',
    licensed: false,
    lng: 120.300,
    lat: 30.420,
    serviceRadiusKm: 99.0,
    stockReady: true,
    enabled: true,
  },
];

/** 待流转处方种子（覆盖：可流转 / 含禁药 / 二次方未审方 / 未审方） */
export const SEED_PRESCRIPTIONS: PrescriptionForRouting[] = [
  {
    id: 'rx-seed-001',
    rxNo: 'RX20261016001',
    patientId: 'pat-1001',
    prescriberId: 'doc-2001',
    status: 'approved',
    secondTime: false,
    drugCategories: ['rx', 'otc'],
  },
  {
    id: 'rx-seed-002',
    rxNo: 'RX20261016002',
    patientId: 'pat-1002',
    prescriberId: 'doc-2002',
    status: 'approved',
    secondTime: true, // 复诊二次方，已审方通过，可流转
    drugCategories: ['rx'],
  },
  {
    id: 'rx-seed-003',
    rxNo: 'RX20261016003',
    patientId: 'pat-1003',
    prescriberId: 'doc-2003',
    status: 'approved',
    secondTime: false,
    drugCategories: ['rx', 'narcotic'], // 含麻醉药品，互联网禁开 → 阻断
  },
  {
    id: 'rx-seed-004',
    rxNo: 'RX20261016004',
    patientId: 'pat-1004',
    prescriberId: 'doc-2004',
    status: 'pending_review', // 复诊二次方未审方 → 阻断
    secondTime: true,
    drugCategories: ['rx'],
  },
];

/** 处方配送追踪种子（rxId → 配送链路） */
export const SEED_DELIVERY_TRACKS: Record<string, DeliveryTrack> = {
  'rx-seed-001': {
    prescriptionId: 'rx-seed-001',
    deliveryNo: 'DLV20261016001',
    channel: 'express',
    currentStage: 'shipped',
    currentTitle: '已发货',
    courierCompany: '健澜同城急送',
    trackingNo: 'JL880123456',
    etaMinutes: 45,
    finished: false,
    timeline: [
      { stage: 'created', title: '药房建单', at: '2026-10-16T08:30:00+08:00', note: '审方通过，处方流转至武林总店' },
      { stage: 'packed', title: '已打包', at: '2026-10-16T09:05:00+08:00', note: '药师复核药品与取货码' },
      { stage: 'shipped', title: '已发货', at: '2026-10-16T09:40:00+08:00', note: '同城骑手取件，派送中' },
    ],
  },
  'rx-seed-002': {
    prescriptionId: 'rx-seed-002',
    deliveryNo: 'DLV20261016002',
    channel: 'self_pick',
    currentStage: 'picked_up',
    currentTitle: '已取药',
    courierCompany: null,
    trackingNo: null,
    etaMinutes: 0,
    finished: true,
    timeline: [
      { stage: 'created', title: '药房建单', at: '2026-10-15T17:10:00+08:00', note: '复诊二次方，审方通过后流转' },
      { stage: 'packed', title: '已备货', at: '2026-10-15T17:40:00+08:00', note: '生成 6 位取货码' },
      { stage: 'picked_up', title: '已取药', at: '2026-10-16T09:15:00+08:00', note: '患者凭取货码到店核销' },
    ],
  },
};

/* ------------------------------------------------------------------ */
/* 纯函数                                                              */
/* ------------------------------------------------------------------ */

/**
 * buildOnlineConsultationFlow()
 * 互联网医院七步问诊-流转-配送流程定义（含每步合规卡口）。
 * 纯函数：无入参、无副作用，返回恒定流程蓝图。
 */
export function buildOnlineConsultationFlow(): {
  steps: FlowStep[];
  stages: ConsultationStage[];
} {
  const steps: FlowStep[] = [
    {
      key: 'appointment',
      order: 1,
      title: '患者预约',
      complianceGate: '实名认证 + 就诊人绑定，慢病复诊方可进入互联网复诊',
    },
    {
      key: 'doctor_accept',
      order: 2,
      title: '医生接诊',
      complianceGate: '接诊医生须持互联网医院线上执业备案，本人接单',
    },
    {
      key: 'online_consult',
      order: 3,
      title: '在线问诊',
      complianceGate: '图文/视频留痕，禁止 AI 自动问诊与自动开方',
    },
    {
      key: 'prescribe',
      order: 4,
      title: '开具处方',
      complianceGate: '麻精毒放等特殊药品禁开；医生本人签名，逐项录入',
    },
    {
      key: 'prescription_route',
      order: 5,
      title: '处方流转',
      complianceGate: '仅审方通过处方可流转；复诊二次方须药师审方；就近选双证药房',
    },
    {
      key: 'drug_delivery',
      order: 6,
      title: '药品配送',
      complianceGate: '地址快照固化，物流单号留痕，全程可追踪、可随访',
    },
    {
      key: 'followup',
      order: 7,
      title: '用药随访',
      complianceGate: '用药回访与不良反应上报，闭环记录不可篡改',
    },
  ];
  return { steps, stages: steps.map((s) => s.key) };
}

/** 按 id 取种子处方（缺失即抛错） */
function mustGetPrescription(prescriptionId: string): PrescriptionForRouting {
  const rx = SEED_PRESCRIPTIONS.find((p) => p.id === prescriptionId);
  if (!rx) {
    throw new Error(`电子处方不存在：${prescriptionId}`);
  }
  return rx;
}

/**
 * verifyOnlinePrescription(prescriptionId)
 * 合规复核：禁开特殊药品 / 复诊二次方须审方 / 处方状态须通过。
 * 纯函数：不抛异常即返回复核报告；违规时 compliant=false、blockers 非空。
 */
export function verifyOnlinePrescription(prescriptionId: string): PrescriptionVerification {
  const rx = mustGetPrescription(prescriptionId);
  const checks: ComplianceCheck[] = [];
  const blockers: string[] = [];

  // 检查 1：禁开特殊管理药品
  const hitBanned = rx.drugCategories.filter((d) =>
    (BANNED_ONLINE_DRUG_CATEGORIES as readonly string[]).includes(d),
  );
  if (hitBanned.length > 0) {
    blockers.push(
      `处方含互联网医院禁开的特殊管理药品：${hitBanned
        .map((d) => BANNED_LABEL[d] ?? d)
        .join('、')}，禁止线上售药`,
    );
  }
  checks.push({
    name: '禁开特殊药品',
    pass: hitBanned.length === 0,
    detail:
      hitBanned.length === 0
        ? '未检出麻精毒放等禁开类别'
        : `检出 ${hitBanned.length} 类禁开药品`,
  });

  // 检查 2：复诊二次方须药师审方通过
  const requiresPharmacistReview = rx.secondTime;
  if (rx.secondTime && rx.status !== 'approved') {
    blockers.push(
      `复诊二次方须经药师审方通过后方可流转，当前状态 ${rx.status}`,
    );
  }
  checks.push({
    name: '二次方审方',
    pass: !rx.secondTime || rx.status === 'approved',
    detail: rx.secondTime
      ? `复诊二次方，当前状态 ${rx.status}（须 approved）`
      : '首诊处方，无二次方强制审方要求',
  });

  // 检查 3：处方整体状态须 approved 才能流转配送
  if (rx.status !== 'approved') {
    blockers.push(`处方当前状态 ${rx.status}，仅审方通过（approved）可流转配送`);
  }
  checks.push({
    name: '处方状态',
    pass: rx.status === 'approved',
    detail: `当前状态 ${rx.status}`,
  });

  return {
    prescriptionId: rx.id,
    compliant: blockers.length === 0,
    requiresPharmacistReview,
    checks,
    blockers,
  };
}

/** 两点经纬度球面距离（公里，Haversine）。纯函数。 */
function haversineKm(a: PatientLocation, b: { lng: number; lat: number }): number {
  const R = 6371.0;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(s)) * 100) / 100;
}

/**
 * routePrescriptionToPharmacy(prescriptionId, patientLocation)
 * 处方流转：先合规复核，再在患者服务半径内、双证齐全、有库存的药房中
 * 选最近一家；超出半径 / 无证 / 无库存 / 不合规均不流转。
 * 纯函数：基于只读种子目录计算，不触库。
 */
export function routePrescriptionToPharmacy(
  prescriptionId: string,
  patientLocation: PatientLocation,
): RouteDecision {
  const rx = mustGetPrescription(prescriptionId);

  // 1) 合规复核（麻精毒放 / 二次方审方 / 处方状态）
  const verification = verifyOnlinePrescription(rx.id);
  if (!verification.compliant) {
    return {
      prescriptionId: rx.id,
      routed: false,
      pharmacyId: null,
      pharmacyName: null,
      distanceKm: null,
      etaMinutes: null,
      channel: null,
      reason: '合规复核未通过，禁止流转售药',
      warnings: verification.blockers,
    };
  }

  // 2) 校验患者定位
  if (
    typeof patientLocation?.lng !== 'number' ||
    typeof patientLocation?.lat !== 'number' ||
    Number.isNaN(patientLocation.lng) ||
    Number.isNaN(patientLocation.lat)
  ) {
    throw new Error('患者定位缺少合法经纬度（lng/lat）');
  }

  // 3) 过滤候选药房：启用 + 双证齐全 + 有库存 + 在服务半径内
  const candidates = SEED_PHARMACIES.filter((ph) => {
    if (!ph.enabled || !ph.licensed || !ph.stockReady) return false;
    const dist = haversineKm(patientLocation, ph);
    return dist <= ph.serviceRadiusKm;
  }).map((ph) => ({ pharmacy: ph, distanceKm: haversineKm(patientLocation, ph) }));

  if (candidates.length === 0) {
    return {
      prescriptionId: rx.id,
      routed: false,
      pharmacyId: null,
      pharmacyName: null,
      distanceKm: null,
      etaMinutes: null,
      channel: null,
      reason: '患者服务半径内无双证齐全且有库存的互联网药房，暂不流转',
      warnings: ['请提示患者前往就近线下药房或调整收货地址'],
    };
  }

  // 4) 选最近一家
  candidates.sort((a, b) => a.distanceKm - b.distanceKm);
  const best = candidates[0]!.pharmacy;
  const distanceKm = candidates[0]!.distanceKm;

  // 5) 配送方式：2km 内可到店自取，否则同城快递
  const channel: 'self_pick' | 'express' = distanceKm <= 2 ? 'self_pick' : 'express';
  // ETA：同城配送约 25km/h + 20 分钟拣药打包
  const etaMinutes = Math.max(15, Math.round((distanceKm / 25) * 60) + 20);

  return {
    prescriptionId: rx.id,
    routed: true,
    pharmacyId: best.id,
    pharmacyName: best.name,
    distanceKm,
    etaMinutes,
    channel,
    reason: `服务半径内双证药房共 ${candidates.length} 家，按就近原则选定`,
    warnings:
      verification.requiresPharmacistReview
        ? ['复诊二次方已药师审方通过，方可流转']
        : [],
  };
}

/**
 * trackDelivery(prescriptionId)
 * 药品配送追踪：按处方回读配送链路（建单→打包→发货→送达/取药）。
 * 纯函数：基于只读种子配送记录计算。
 */
export function trackDelivery(prescriptionId: string): DeliveryTrack {
  mustGetPrescription(prescriptionId);
  const track = SEED_DELIVERY_TRACKS[prescriptionId];
  if (!track) {
    throw new Error(`该处方尚未生成配送单：${prescriptionId}`);
  }
  return track;
}
