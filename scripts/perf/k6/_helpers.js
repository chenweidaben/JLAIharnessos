// 健澜科技杠OS — k6 压测公共助手
// 运行：k6 run scripts/perf/k6/smoke.js
//   可选环境变量：
//     BASE_URL（默认 http://127.0.0.1:8080）
//     PERF_USERNAME / PERF_PASSWORD（压测专用账号，默认仅为本地演示种子账号）
//
// Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.

import http from 'k6/http';
import { check, group } from 'k6';

export const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const PERF_USERNAME = __ENV.PERF_USERNAME || 'doctor_chen';
const PERF_PASSWORD = __ENV.PERF_PASSWORD || 'perf-test-only';

// k6 setup：所有 VU 共享一次登录获取的访问令牌。
// 生产压测必须通过环境变量注入专用压测账号，禁止使用真实医护账号。
export function setup() {
  const res = http.post(
    `${BASE_URL}/api/v1/auth/login`,
    JSON.stringify({ username: PERF_USERNAME, password: PERF_PASSWORD }),
    { headers: { 'Content-Type': 'application/json' }, tags: { api: 'auth' } },
  );
  const ok = check(res, {
    'login status 200': (r) => r.status === 200,
    'accessToken returned': (r) => !!r.json('data.tokens.accessToken'),
  });
  if (!ok) throw new Error('登录失败，压测终止：请确认 BFF 已启动且 BASE_URL 正确');
  return { token: res.json('data.tokens.accessToken') };
}

function auth(token) {
  return { headers: { Authorization: `Bearer ${token}` }, tags: { api: 'bff' } };
}

// 典型只读浏览场景：健康探针 → 患者检索 → 患者360 → 仪表盘统计。
export function browseScenario(token) {
  group('只读浏览场景', () => {
    const health = http.get(`${BASE_URL}/health`);
    check(health, { 'health 200': (r) => r.status === 200 });

    const list = http.get(`${BASE_URL}/api/v1/patients?keyword=%E5%BC%A0`, auth(token));
    check(list, { 'patients 200': (r) => r.status === 200 });

    const firstId = list.json('data.list.0.id') || list.json('data.0.id') || 'P1001';
    const p360 = http.get(`${BASE_URL}/api/v1/patients/${firstId}/360`, auth(token));
    check(p360, { 'patient360 200': (r) => r.status === 200 });

    const stats = http.get(`${BASE_URL}/api/v1/dashboard/stats`, auth(token));
    check(stats, { 'dashboard stats 200': (r) => r.status === 200 });
  });
}

// 通用阈值（生产 SLO 基线，可按场景收紧）
export const READ_THRESHOLDS = {
  http_req_failed: ['rate<0.01'], // 错误率 < 1%
  http_req_duration: ['p(95)<500', 'p(99)<1000'], // P95 < 500ms，P99 < 1s
};
