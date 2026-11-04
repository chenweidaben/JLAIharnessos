# 15:23 轮主线巡检——P4-3 登录防爆破+速率限制独立复测收口（首跑 3 fail 判定 BFF 内存残留假红）

时间：2026-11-05 01:10（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`06bbcccf`（14:23 轮 P4-2 收口）

## 本轮结论

P4-3 登录防爆破+速率限制已由组织智能体 `o_000Rfj7NkAk` 交付（commits `c219adf4` feat + `2ee98331` docs 台账 + `e4dfd08c` docs 简报）。主线首跑 3 fail，判定为 BFF 内存状态残留假红，重启 BFF 清库存后复跑全绿。本轮收口。

## 首跑假红判定

首跑 14 pass / 3 fail / 163 expect，3 个失败全部集中在账号锁定（423）用例：
- 错密码 5 次后第 6 次期望 423，实际 429
- admin /status 看不到该锁定账号
- admin unlock 后账号解锁失败

根因：同进程先跑 IP 防爆破用例（同 IP 快速 21 次 → 429），把测试 IP 打入 `bannedUntil` 5min；随后账号锁定用例还没攒够 5 次失败，请求就被 IP 限流 429 拦截，根本到不了账号锁定分支。这是 P1-3 + P3-3 同款"BFF 内存库存残留假红"，不是产品 bug。

处置：杀 8080 pid 重启 BFF（DEMO_MODE=1），复跑同一份测试 → 17 pass / 0 fail / 165 expect。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit` | exit 0 / 0B |
| `bun test ./tests/unit/loginLockout.test.ts ./tests/integration/loginLockout-e2e.test.ts` | 17 pass / 0 fail / 165 expect（13 unit + 4 e2e，重启 BFF 后） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,790 文件 0 命中 |
| BFF 五健康端点 | 全 200（主线重启后实测） |
| Vite 5173 首页 | 200（pid 11528 全程未重启） |
| 工作区 tracked 改动 | 无 |

## P4-3 交付物

- 账号失败锁定：5 次连续错密码 → lockedUntil = now+15min，HTTP 423 code=42300；admin unlock 手动解锁。
- IP 登录限流：同 IP >20 次/min → bannedUntil = now+5min，HTTP 429 code=42900。
- 通用 read/write 滑动桶纯函数已实现（read 100/60s、write 30/60s），下一轮全局挂载。
- admin 路由：GET `/api/v1/rate-limit/status`、POST `/unlock`、POST `/check`。

## 未覆盖（台账已标注）

通用 read/write 桶全局挂载、login action 特例映射 P4-1 哈希链、分布式 Redis 限流、Captcha 二次校验、账号/IP 白名单配置化。
