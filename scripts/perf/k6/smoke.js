// 冒烟测试：1 VU 持续 1 分钟，验证链路与阈值（每次发布后先跑）。
// k6 run scripts/perf/k6/smoke.js
//
// Copyright (c) 2026 健澜科技. Licensed under Apache-2.0.

import { sleep } from 'k6';
import { setup, browseScenario, READ_THRESHOLDS } from './_helpers.js';

export { setup };

export const options = {
  vus: 1,
  duration: '1m',
  thresholds: READ_THRESHOLDS,
};

export default function (data) {
  browseScenario(data.token);
  sleep(1);
}
