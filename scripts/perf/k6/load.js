// 常规负载测试：阶梯加压到 50 VU 并保持，验证典型工作日负载下的 SLO。
// k6 run scripts/perf/k6/load.js
//
// Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.

import { sleep } from 'k6';
import { setup, browseScenario, READ_THRESHOLDS } from './_helpers.js';

export { setup };

export const options = {
  stages: [
    { duration: '2m', target: 20 }, // 爬坡
    { duration: '5m', target: 50 }, // 典型高峰
    { duration: '2m', target: 0 }, // 回落
  ],
  thresholds: READ_THRESHOLDS,
};

export default function (data) {
  browseScenario(data.token);
  sleep(Math.random() * 2 + 1); // 模拟医生思考间隔 1~3s
}
