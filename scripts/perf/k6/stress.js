// 压力/拐点测试：持续加压到 200 VU，观察系统在超预期负载下的退化与恢复，
// 验证限流、熔断、优雅降级是否生效（不应出现进程崩溃或雪崩）。
// k6 run scripts/perf/k6/stress.js
//
// Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.

import { sleep } from 'k6';
import { setup, browseScenario } from './_helpers.js';

export { setup };

export const options = {
  stages: [
    { duration: '2m', target: 50 },
    { duration: '5m', target: 100 },
    { duration: '5m', target: 200 }, // 超出常规容量，寻找拐点
    { duration: '3m', target: 0 }, // 卸载后观察恢复
  ],
  thresholds: {
    // 压力场景放宽错误率阈值，重点是“过载被限流/降级而非崩溃”
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<2000'],
  },
};

export default function (data) {
  browseScenario(data.token);
  sleep(0.5);
}
