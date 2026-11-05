/**
 * 健澜AI原生医院操作系统OS - P5-15 SIEM Syslog-CEF 输出适配器（mock，未联调）
 *
 * ⚠️ NOT INTEGRATED — mock only, no real syslog endpoint.
 *
 * CEF 格式：CEF:0|<vendor>|<product>|<version>|<sigId>|<name>|<severity>|<extensions>
 *   - vendor: 中性名（健澜）
 *   - extensions: src / suser / act / outcome / cs1+cs1Label (module)
 *   - 转义规则：| 和 \ 必须转义；换行必须去掉（CEF 一条事件一行）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */

export interface AuditEventLike {
  at?: string;
  actorId?: string;
  ip?: string;
  action: string;
  result: string;
  module?: string;
  detail?: string;
}

export interface CEFMessage {
  line: string;
}

function escapeCEF(s: string): string {
  return s
    .replace(/\\/g, '\\\\')
    .replace(/\|/g, '\\|')
    .replace(/[\r\n]+/g, ' ');
}

export function formatCEF(event: AuditEventLike): CEFMessage {
  const vendor = 'Jianlan';
  const product = 'HospitalOS';
  const version = '1.0';
  const sigId = `WORM_${escapeCEF(event.action).toUpperCase().replace(/\s+/g, '_')}`;
  const name = escapeCEF(event.action);
  const severity = event.result === 'ok' ? '5' : '3';
  const ext: string[] = [];
  if (event.ip) ext.push(`src=${escapeCEF(event.ip)}`);
  if (event.actorId) ext.push(`suser=${escapeCEF(event.actorId)}`);
  ext.push(`act=${escapeCEF(event.action)}`);
  ext.push(`outcome=${escapeCEF(event.result)}`);
  ext.push('cs1Label=module');
  ext.push(`cs1=${escapeCEF(event.module ?? 'worm')}`);
  if (event.at) ext.push(`rt=${escapeCEF(event.at)}`);
  if (event.detail) ext.push(`msg=${escapeCEF(event.detail)}`);
  const line = `CEF:0|${vendor}|${product}|${version}|${sigId}|${name}|${severity}|${ext.join(' ')}`;
  return { line };
}

export interface SyslogExporter {
  send(events: AuditEventLike[]): Promise<{ sent: number; failed: number }>;
}

/**
 * Mock Syslog：所有报文进内存，供测试断言。
 * 失败策略：当前不重试；send 返回 sent/failed 计数。
 * 联调时若需重试，可在实现里加指数退避（最多 3 次，间隔 1s/2s/4s）。
 */
export class MockSyslogExporter implements SyslogExporter {
  public messages: string[] = [];
  public failNext = 0; // 模拟接下来 N 条失败

  async send(events: AuditEventLike[]): Promise<{ sent: number; failed: number }> {
    let sent = 0;
    let failed = 0;
    for (const ev of events) {
      const { line } = formatCEF(ev);
      if (this.failNext > 0) {
        this.failNext--;
        failed++;
        continue;
      }
      this.messages.push(line);
      sent++;
    }
    return { sent, failed };
  }
}
