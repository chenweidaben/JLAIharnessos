# 性能压测（k6）

健澜科技杠OS 使用 [Grafana k6](https://k6.io/) 对 BFF 进行 HTTP 层负载与压力测试，
验证在门诊高峰等场景下的吞吐、时延与过载保护能力。

## 前置

1. 安装 k6：<https://k6.io/docs/get-started/installation/>
2. 启动 BFF（默认监听 8080）：

```bash
bun run src/bff/server.ts
# 或使用容器：docker compose up -d app
```

## 场景

| 脚本 | 目的 | 负载 |
| ---- | ---- | ---- |
| `smoke.js` | 冒烟：链路可用、阈值正确（每次发布后先跑） | 1 VU / 1 分钟 |
| `load.js` | 常规负载：模拟工作日高峰，验证 SLO | 爬坡至 50 VU，约 9 分钟 |
| `stress.js` | 压力/拐点：超预期负载下验证限流、熔断、降级与恢复 | 加压至 200 VU，约 15 分钟 |

```bash
# 默认压本机 8080
k6 run scripts/perf/k6/smoke.js
k6 run scripts/perf/k6/load.js

# 指定目标
BASE_URL=http://staging.example.com k6 run scripts/perf/k6/load.js
```

## SLO 阈值（冒烟/常规）

- 错误率 `http_req_failed < 1%`；
- P95 < 500ms、P99 < 1s（压力场景放宽至错误率 < 5%、P95 < 2s）。

阈值写在脚本 `options.thresholds`，未达标 k6 以非零码退出，可直接接入 CI 质量门禁。

## 覆盖的业务路径

`_helpers.js#browseScenario` 覆盖只读高频链路：

1. `GET /health` 存活探针；
2. `POST /api/v1/auth/login` 登录换取 JWT（setup 阶段一次）；
3. `GET /api/v1/patients?keyword=` 患者检索；
4. `GET /api/v1/patients/:id/360` 患者 360 全景聚合；
5. `GET /api/v1/dashboard/stats` 工作台统计。

> 写操作（开医嘱、处方等）涉及高风险人工确认，不在通用压测中直接施压；
> 如需压测请在隔离环境使用专门构造的数据，并评估审计与下游影响。

## 注意事项

- **严禁未经授权对生产环境压测**；压测统一在专用性能环境进行；
- 当前 BFF 多为进程内 Mock 聚合，结果反映网关与编排开销；接入真实 HIS/LIS 后，
  需结合适配器超时、熔断与下游容量重新标定阈值；
- 压测期间同步观察 Grafana「平台总览」大盘与 Prometheus 告警，验证可观测性闭环；
- 结果与基线请归档到性能测试报告，作为容量规划与扩缩容依据。
