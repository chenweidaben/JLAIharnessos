/**
 * 健澜科技杠OS - Prometheus 指标模块单测
 *
 * Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.
 */

import { describe, expect,it } from 'bun:test';

import {
  Counter,
  Gauge,
  Histogram,
  metrics,
  MetricsRegistry,
  recordHttpRequest,
  renderMetrics,
} from '@/bff/observability/metrics.js';

describe('Counter', () => {
  it('累加并按标签区分序列', () => {
    const c = new Counter('t_counter_total', 'help', ['method', 'code']);
    c.inc({ method: 'GET', code: 200 });
    c.inc({ method: 'GET', code: 200 }, 2);
    c.inc({ method: 'POST', code: 201 });
    const out = c.render();
    expect(out).toContain('t_counter_total{code="200",method="GET"} 3');
    expect(out).toContain('t_counter_total{code="201",method="POST"} 1');
    expect(out).toContain('# TYPE t_counter_total counter');
  });

  it('转义标签值中的引号与换行', () => {
    const c = new Counter('t_esc_total', 'h', ['route']);
    c.inc({ route: 'a"b\nc' });
    expect(c.render()).toContain('{route="a\\"b\\nc"}');
  });
});

describe('Gauge', () => {
  it('set/inc/dec 行为正确', () => {
    const g = new Gauge('t_gauge', 'h', ['q']);
    g.set({ q: 'a' }, 5);
    g.inc({ q: 'a' });
    g.dec({ q: 'a' }, 2);
    expect(g.render()).toContain('t_gauge{q="a"} 4');
  });
});

describe('Histogram', () => {
  it('输出累积桶、sum、count 与 +Inf', () => {
    const h = new Histogram('t_latency', 'h', ['route'], [0.1, 0.5, 1]);
    h.observe({ route: 'r' }, 0.05);
    h.observe({ route: 'r' }, 0.4);
    h.observe({ route: 'r' }, 2);
    const out = h.render();
    // 0.05 落入 0.1 桶；0.4 落入 0.5 桶；2 仅落入 +Inf
    expect(out).toContain('t_latency_bucket{route="r",le="0.1"} 1');
    expect(out).toContain('t_latency_bucket{route="r",le="0.5"} 2');
    expect(out).toContain('t_latency_bucket{route="r",le="1"} 2');
    expect(out).toContain('t_latency_bucket{route="r",le="+Inf"} 3');
    expect(out).toContain('t_latency_count{route="r"} 3');
    expect(out).toContain('t_latency_sum{route="r"} 2.45');
  });

  it('startTimer 记录非负时延', () => {
    const h = new Histogram('t_timer', 'h');
    const end = h.startTimer();
    const seconds = end();
    expect(seconds).toBeGreaterThanOrEqual(0);
    expect(h.render()).toContain('t_timer_count ' + 1);
  });
});

describe('MetricsRegistry', () => {
  it('拒绝重复指标名', () => {
    const r = new MetricsRegistry();
    r.register(new Counter('dup_total', 'h'));
    expect(() => r.register(new Counter('dup_total', 'h'))).toThrow(/重复注册/);
  });

  it('单例渲染包含内置指标与 up=1', () => {
    recordHttpRequest({ method: 'GET', route: '/health', code: 200, durationSeconds: 0.001 });
    const out = renderMetrics();
    expect(out).toContain('gangos_up 1');
    expect(out).toContain('gangos_http_requests_total');
    expect(out).toContain('gangos_http_request_duration_seconds_bucket');
    // 路由使用模板标签，不泄露高基数路径
    expect(out).toContain('route="/health"');
    expect(metrics.httpRequests.name).toBe('gangos_http_requests_total');
  });
});
