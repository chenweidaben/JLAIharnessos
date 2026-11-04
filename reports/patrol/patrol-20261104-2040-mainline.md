# 巡检简报 2026-11-04 20:40 轮

## 本轮动作

组织智能体 `o_000Rfj7NkAk` 交付 P0-7 收尾深化（真实口令哈希 + admin 不绕过权限），主线独立复测全绿。

## 复测结论

| 项 | 结果 |
|---|---|
| 根 tsc | exit 0 / 0B |
| web tsc | exit 0 / 0B |
| p07TailLogin 单测+E2E | 18 pass / 0 fail |
| CPOE 回归 | **32 pass / 0 fail**（含主线修旧断言 1 条） |
| 品牌扫描（17 词 Ordinal） | 9,751 文件 / **0 命中** |
| 五健康端点 | 全 200 |
| BFF | pid 19752（19:54:20 重启） |
| Vite | pid 11528 未动 |

## commit 链（599a1346 → aac6b906）

- `fea2ef86` feat(auth)：真实口令哈希 + admin 不再凭角色绕过
- `93103351` docs：台账回写
- `aac6b906` docs：本轮简报
- 主线补：`orderCpoe.test.ts` 旧断言 "admin 三动作全通" 改为 "admin 角色 permissions=[] → 403" + "permissions=['*'] → 全通"

## P0-7 收尾改动

- `auth.ts`：scrypt 口令表（demo-doctor/demo-nurse/demo-pharmacist/demo-admin）+ verifyDemoPassword + timingSafeEqual
- `orderCpoeAggregator.ts`：assertCan 去 admin 角色硬绕过，改 permissions.includes('*') 通配

登录实测：正确口令 200 下发 token、错误密码 401 code=40101、未知用户同文案防枚举。admin 角色 permissions=[] → 三动作均 403。

## 未覆盖

生产口令接 iam 真实用户表、刷新令牌轮换落库、MFA 强制开启。

## 下一切片

P0-8 起，等主线定方向。
