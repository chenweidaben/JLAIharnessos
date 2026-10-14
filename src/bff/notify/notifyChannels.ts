/**
 * 健澜科技 jlmedaios - 微信/钉钉通知 Webhook 通道（纯函数骨架）
 *
 * 覆盖业务事件：
 *  - 危急值（notifyCriticalValue）
 *  - 待审批（notifyPendingApproval）
 *  - 随访提醒（notifyFollowup）
 *
 * 设计约定：
 *  - DEMO 模式（DEMO_MODE=1/true）或骨架阶段，sendWechatWebhook / sendDingTalkWebhook
 *    仅 console.info 打印 payload，不真实发起 HTTP 请求；后续在 TODO 处接入 fetch/HTTP 客户端即可。
 *  - Webhook URL 与事件开关保存在进程内存（见 getNotifyConfig/setNotifyConfig），不建 DB 表。
 *  - 本模块不引入任何新依赖，仅使用 Node/Bun 内置能力。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

/* ------------------------------------------------------------------ */
/* 类型与内存配置                                                      */
/* ------------------------------------------------------------------ */

/** 发送给 webhook 的统一载荷 */
export interface NotifyPayload {
  /** 消息标题（钉钉/企微 card 用；text 模式可并入正文） */
  title: string;
  /** 消息正文 */
  text: string;
  /** 业务扩展字段（危急值等级、患者号、科室等），按需透传 */
  meta?: Record<string, unknown>;
}

/** 通知渠道开关 */
export interface NotifyEventSwitches {
  /** 危急值推送 */
  criticalValue: boolean;
  /** 待审批提醒 */
  pendingApproval: boolean;
  /** 随访提醒 */
  followup: boolean;
}

/** 通知配置（内存态） */
export interface NotifyConfig {
  /** 企业微信群机器人 webhook 地址 */
  wechatWebhookUrl: string;
  /** 钉钉群机器人 webhook 地址 */
  dingTalkWebhookUrl: string;
  /** 三类业务事件开关 */
  enabled: NotifyEventSwitches;
}

const DEFAULT_CONFIG: NotifyConfig = {
  wechatWebhookUrl: '',
  dingTalkWebhookUrl: '',
  enabled: { criticalValue: true, pendingApproval: true, followup: true },
};

/** 进程内存配置副本（避免外部直接篡改内部状态） */
let memoryConfig: NotifyConfig = {
  wechatWebhookUrl: DEFAULT_CONFIG.wechatWebhookUrl,
  dingTalkWebhookUrl: DEFAULT_CONFIG.dingTalkWebhookUrl,
  enabled: { ...DEFAULT_CONFIG.enabled },
};

/** 判断是否处于 DEMO 模式（与 system.ts 的判定保持一致） */
function isDemoMode(): boolean {
  return process.env.DEMO_MODE === '1' || process.env.DEMO_MODE === 'true';
}

/** 深拷贝配置，对外返回安全副本 */
function cloneConfig(c: NotifyConfig): NotifyConfig {
  return { ...c, enabled: { ...c.enabled } };
}

/** 读取当前内存通知配置（返回副本） */
export function getNotifyConfig(): NotifyConfig {
  return cloneConfig(memoryConfig);
}

/** 合并并写入内存通知配置，返回最新配置副本 */
export function setNotifyConfig(patch: Partial<NotifyConfig>): NotifyConfig {
  memoryConfig = {
    wechatWebhookUrl:
      typeof patch.wechatWebhookUrl === 'string'
        ? patch.wechatWebhookUrl.trim()
        : memoryConfig.wechatWebhookUrl,
    dingTalkWebhookUrl:
      typeof patch.dingTalkWebhookUrl === 'string'
        ? patch.dingTalkWebhookUrl.trim()
        : memoryConfig.dingTalkWebhookUrl,
    enabled: { ...memoryConfig.enabled, ...(patch.enabled ?? {}) },
  };
  return cloneConfig(memoryConfig);
}

/* ------------------------------------------------------------------ */
/* 底层 webhook 发送（骨架：DEMO 仅打印日志，不发 HTTP）               */
/* ------------------------------------------------------------------ */

export interface SendResult {
  /** 是否进入发送流程（未配置 url 视为跳过而非失败） */
  ok: boolean;
  /** 是否为 DEMO/骨架打印（未真实发 HTTP） */
  demo: boolean;
  channel: 'wechat' | 'dingtalk';
  reason?: string;
}

/**
 * 企业微信群机器人 webhook。
 * 骨架阶段不真实发送：无论 DEMO_MODE 如何，都只 console.info 打印。
 * 真实接入时在下方 TODO 处用 POST JSON（msgtype=text/markdown）替换即可。
 */
export function sendWechatWebhook(url: string, payload: NotifyPayload): SendResult {
  const channel: SendResult['channel'] = 'wechat';
  if (!url) {
    return { ok: false, demo: true, channel, reason: '未配置企业微信 webhook' };
  }
  // TODO(prod): 接入真实发送
  //   await fetch(url, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({ msgtype: 'text', text: { content: `【${payload.title}】\n${payload.text}` } }),
  //   });
  console.info('[notify:wechat] (demo, no real HTTP) ->', url, JSON.stringify(payload));
  return { ok: true, demo: true, channel };
}

/**
 * 钉钉群机器人 webhook。
 * 骨架阶段不真实发送：无论 DEMO_MODE 如何，都只 console.info 打印。
 * 真实接入时在下方 TODO 处用 POST JSON（msgtype=text）替换即可。
 */
export function sendDingTalkWebhook(url: string, payload: NotifyPayload): SendResult {
  const channel: SendResult['channel'] = 'dingtalk';
  if (!url) {
    return { ok: false, demo: true, channel, reason: '未配置钉钉 webhook' };
  }
  // TODO(prod): 接入真实发送
  //   await fetch(url, {
  //     method: 'POST',
  //     headers: { 'Content-Type': 'application/json' },
  //     body: JSON.stringify({
  //       msgtype: 'text',
  //       text: { content: `【${payload.title}】\n${payload.text}` },
  //     }),
  //   });
  console.info('[notify:dingtalk] (demo, no real HTTP) ->', url, JSON.stringify(payload));
  return { ok: true, demo: true, channel };
}

/** 按当前配置，把一条载荷同时推送到已配置的企业微信与钉钉 */
function dispatch(payload: NotifyPayload): SendResult[] {
  const cfg = getNotifyConfig();
  const results: SendResult[] = [];
  results.push(sendWechatWebhook(cfg.wechatWebhookUrl, payload));
  results.push(sendDingTalkWebhook(cfg.dingTalkWebhookUrl, payload));
  return results;
}

/* ------------------------------------------------------------------ */
/* 业务事件封装                                                        */
/* ------------------------------------------------------------------ */

export interface CriticalValueEvent {
  patientName: string;
  patientId?: string;
  ward?: string;
  item: string;
  value: string;
  level?: string;
}

export interface PendingApprovalEvent {
  title: string;
  applicant?: string;
  summary?: string;
}

export interface FollowupEvent {
  patientName: string;
  plan?: string;
  dueAt?: string;
}

/**
 * 危急值通知。开关关闭时跳过；否则组装文案并推送到已配置渠道。
 */
export function notifyCriticalValue(ev: CriticalValueEvent): SendResult[] {
  const cfg = getNotifyConfig();
  if (!cfg.enabled.criticalValue) {
    console.info('[notify:criticalValue] 开关关闭，跳过', ev.patientName);
    return [];
  }
  const payload: NotifyPayload = {
    title: '【危急值预警】',
    text:
      `患者：${ev.patientName}${ev.patientId ? `（${ev.patientId}）` : ''}\n` +
      `科室/病区：${ev.ward ?? '未填写'}\n` +
      `项目：${ev.item}\n` +
      `结果：${ev.value}${ev.level ? `（${ev.level}）` : ''}\n` +
      '请立即按危急值流程复核与处置。',
    meta: { kind: 'criticalValue', ...ev },
  };
  return dispatch(payload);
}

/**
 * 待审批通知。开关关闭时跳过。
 */
export function notifyPendingApproval(ev: PendingApprovalEvent): SendResult[] {
  const cfg = getNotifyConfig();
  if (!cfg.enabled.pendingApproval) {
    console.info('[notify:pendingApproval] 开关关闭，跳过', ev.title);
    return [];
  }
  const payload: NotifyPayload = {
    title: '【待审批提醒】',
    text:
      `事项：${ev.title}\n` +
      `申请人：${ev.applicant ?? '未知'}\n` +
      `摘要：${ev.summary ?? '无'}\n` +
      '请及时登录系统处理审批。',
    meta: { kind: 'pendingApproval', ...ev },
  };
  return dispatch(payload);
}

/**
 * 随访提醒通知。开关关闭时跳过。
 */
export function notifyFollowup(ev: FollowupEvent): SendResult[] {
  const cfg = getNotifyConfig();
  if (!cfg.enabled.followup) {
    console.info('[notify:followup] 开关关闭，跳过', ev.patientName);
    return [];
  }
  const payload: NotifyPayload = {
    title: '【随访提醒】',
    text:
      `患者：${ev.patientName}\n` +
      `随访计划：${ev.plan ?? '未填写'}\n` +
      `随访时间：${ev.dueAt ?? '尽快'}\n` +
      '请安排责任医生按时完成随访。',
    meta: { kind: 'followup', ...ev },
  };
  return dispatch(payload);
}

/**
 * 配置页“测试发送”：按事件类型直接推送一条演示消息。
 * 不受业务开关拦截（用于联调渠道连通性）。
 */
export function testNotify(event: 'criticalValue' | 'pendingApproval' | 'followup'): SendResult[] {
  if (event === 'criticalValue') {
    return notifyCriticalValue({
      patientName: '测试患者',
      ward: '测试病区',
      item: '血钾',
      value: '6.8 mmol/L',
      level: '危急',
    });
  }
  if (event === 'pendingApproval') {
    return notifyPendingApproval({
      title: '测试审批单',
      applicant: '陈维',
      summary: '这是一条渠道连通性测试消息。',
    });
  }
  return notifyFollowup({
    patientName: '测试患者',
    plan: '出院后一周电话随访',
    dueAt: new Date().toISOString(),
  });
}
