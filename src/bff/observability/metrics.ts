/**
 * 健澜科技杠OS - BFF 可观测性指标（零依赖 Prometheus 文本格式）
 *
 * 不引入 prom-client 等第三方依赖，直接实现 Counter / Gauge / Histogram 与
 * Prometheus exposition format（text/plain; version=0.0.4），由 GET /metrics 暴露，
 * 供集群内 Prometheus 抓取。指标名统一使用 gangos_ 前缀，避免与 exporter 冲突。
 *
 * 标签基数控制：route 使用路由模板（如 /api/v1/patient/:id）而非真实路径，
 * 严禁把 patientId、traceId、自由文本作为标签值，避免时序爆炸。
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

/** 标签键值对（值一律转为字符串） */
export type Labels = Record<string, string | number | boolean | undefined>;

/** 默认时延桶（秒），覆盖亚毫秒本地调用到秒级外部 HIS 聚合 */
const DEFAULT_BUCKETS = [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10];

function escapeHelp(text: string): string {
  return text.replace(/\\/g, '\\\\').replace(/\n/g, '\\n');
}

function escapeLabelValue(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/"/g, '\\"')
    .replace(/\n/g, '\\n');
}

/** 规范化标签：固定顺序、过滤 undefined，保证同一组标签生成唯一 key */
function normalize(labels: Labels | undefined, names: string[]): string {
  const chosen = names.length ? names : Object.keys(labels ?? {});
  return chosen
    .slice()
    .sort()
    .map((k) => {
      const raw = labels?.[k];
      return `${k}="${escapeLabelValue(raw === undefined ? '' : String(raw))}"`;
    })
    .join(',');
}

function renderLabels(labels: Labels | undefined, names: string[]): string {
  const key = normalize(labels, names);
  return key ? `{${key}}` : '';
}

/** 单调递增计数器 */
export class Counter {
  private readonly values = new Map<string, { labels: Labels; value: number }>();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
  ) {}

  inc(labels?: Labels, value = 1): void {
    const key = normalize(labels, this.labelNames);
    const cur = this.values.get(key);
    if (cur) cur.value += value;
    else this.values.set(key, { labels: labels ?? {}, value });
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${escapeHelp(this.help)}`, `# TYPE ${this.name} counter`];
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${renderLabels(labels, this.labelNames)} ${value}`);
    }
    return lines.join('\n');
  }
}

/** 可增可减瞬时值 */
export class Gauge {
  private readonly values = new Map<string, { labels: Labels; value: number }>();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
  ) {}

  set(labels: Labels | undefined, value: number): void {
    const key = normalize(labels, this.labelNames);
    this.values.set(key, { labels: labels ?? {}, value });
  }

  inc(labels?: Labels, value = 1): void {
    const key = normalize(labels, this.labelNames);
    const cur = this.values.get(key);
    if (cur) cur.value += value;
    else this.values.set(key, { labels: labels ?? {}, value });
  }

  dec(labels?: Labels, value = 1): void {
    this.inc(labels, -value);
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${escapeHelp(this.help)}`, `# TYPE ${this.name} gauge`];
    for (const { labels, value } of this.values.values()) {
      lines.push(`${this.name}${renderLabels(labels, this.labelNames)} ${value}`);
    }
    return lines.join('\n');
  }
}

/** 直方图（累积桶 + sum + count） */
export class Histogram {
  private readonly buckets: number[];
  private readonly observations = new Map<
    string,
    { labels: Labels; counts: number[]; sum: number; count: number }
  >();

  constructor(
    public readonly name: string,
    public readonly help: string,
    public readonly labelNames: string[] = [],
    buckets: number[] = DEFAULT_BUCKETS,
  ) {
    this.buckets = [...buckets].sort((a, b) => a - b);
  }

  observe(labels: Labels | undefined, value: number): void {
    const key = normalize(labels, this.labelNames);
    let obs = this.observations.get(key);
    if (!obs) {
      obs = {
        labels: labels ?? {},
        counts: Array.from({ length: this.buckets.length }, () => 0),
        sum: 0,
        count: 0,
      };
      this.observations.set(key, obs);
    }
    obs.sum += value;
    obs.count += 1;
    for (let i = 0; i < this.buckets.length; i++) {
      if (value <= this.buckets[i]) obs.counts[i] += 1;
    }
  }

  /** 计时器：返回结束函数，调用时记录经过秒数 */
  startTimer(labels?: Labels): () => number {
    const start = performance.now();
    return () => {
      const seconds = (performance.now() - start) / 1000;
      this.observe(labels, seconds);
      return seconds;
    };
  }

  render(): string {
    const lines = [`# HELP ${this.name} ${escapeHelp(this.help)}`, `# TYPE ${this.name} histogram`];
    for (const obs of this.observations.values()) {
      const base = renderLabels(obs.labels, this.labelNames);
      // observe 时已对所有 le>=value 的桶递增，故 counts[i] 即累积桶计数，直接输出
      this.buckets.forEach((le, i) => {
        const extra = base.endsWith('}') ? base.slice(0, -1) + `,le="${le}"}` : `{le="${le}"}`;
        lines.push(`${this.name}_bucket${extra} ${obs.counts[i]}`);
      });
      const inf = base.endsWith('}')
        ? base.slice(0, -1) + ',le="+Inf"}'
        : '{le="+Inf"}';
      lines.push(`${this.name}_bucket${inf} ${obs.count}`);
      lines.push(`${this.name}_sum${base} ${Number(obs.sum.toFixed(6))}`);
      lines.push(`${this.name}_count${base} ${obs.count}`);
    }
    return lines.join('\n');
  }
}

/** 指标注册中心，集中渲染 */
export class MetricsRegistry {
  private readonly metrics: (Counter | Gauge | Histogram)[] = [];

  register<T extends Counter | Gauge | Histogram>(metric: T): T {
    if (this.metrics.some((m) => m.name === metric.name)) {
      throw new Error(`指标重复注册: ${metric.name}`);
    }
    this.metrics.push(metric);
    return metric;
  }

  render(): string {
    return this.metrics.map((m) => m.render()).join('\n') + '\n';
  }
}

/** 进程级单例（BFF 与测试共享同一注册中心） */
export const registry = new MetricsRegistry();

/** 业务与运行时指标集合（Grafana / 告警规则以此处指标名为准） */
export const metrics = {
  up: registry.register(new Gauge('gangos_up', 'BFF 进程是否存活（1=存活）')),
  httpRequests: registry.register(
    new Counter('gangos_http_requests_total', 'HTTP 请求总数', ['method', 'route', 'code']),
  ),
  httpDuration: registry.register(
    new Histogram('gangos_http_request_duration_seconds', 'HTTP 请求处理时延（秒）', ['method', 'route']),
  ),
  wsConnections: registry.register(new Gauge('gangos_ws_connections', '当前 WebSocket 连接数')),
  agentRuns: registry.register(
    new Counter('gangos_agent_runs_total', '智能体运行次数', ['agent', 'status', 'trigger']),
  ),
  agentRunDuration: registry.register(
    new Histogram('gangos_agent_run_duration_seconds', '智能体运行时长（秒）', ['agent', 'trigger']),
  ),
  toolCalls: registry.register(
    new Counter('gangos_tool_calls_total', '医疗工具调用次数', ['tool', 'category', 'risk', 'result']),
  ),
  humanTasks: registry.register(
    new Counter('gangos_human_tasks_total', '人工在环任务处理次数', ['outcome']),
  ),
  cdsAlerts: registry.register(
    new Counter('gangos_cds_alerts_total', 'CDS 临床决策提醒次数', ['kind', 'severity']),
  ),
};

/** 记录一次 HTTP 请求（在响应返回时调用） */
export function recordHttpRequest(opts: {
  method: string;
  route: string;
  code: number;
  durationSeconds: number;
}): void {
  const common = { method: opts.method, route: opts.route };
  metrics.httpRequests.inc({ ...common, code: String(opts.code) });
  metrics.httpDuration.observe(common, opts.durationSeconds);
}

/** 渲染 Prometheus 文本格式 */
export function renderMetrics(): string {
  metrics.up.set({}, 1);
  return registry.render();
}
