# 17:23 轮主线巡检——P4-5 取证包独立复测 + 路由重复技术债清零收口

时间：2026-11-05 00:30（Asia/Shanghai）
分支：consult-agent-m86
上一轮三端对齐基线：`b59915d5`（16:23 轮 P4-4 收口）

## 本轮结论

P4-5 操作回放与取证包已由组织智能体 `o_000Rfj7NkAk` 交付（commits `18e882a4` feat + `008dd003` docs 台账 + `23633474` docs 简报），主线独立复测全绿。等保三级"可追溯"维度的最后一块——按时间窗聚合导出证据包——落地。

本轮主线另处置两项：一是 P4-5 取证包独立复测（等保三级"可追溯"维度闭环），二是 `web/src/router/index.tsx` 的 **201 个重复 Route path** 全部清零（3070 条声明 → 2870 条，全部唯一），其中 3 处为同 path 不同 element 的真冲突，已按业务语义定夺并修复。

期间组织智能体实时推进了 P5-1 质量管理指标闭环（`c680deb2`），主线独立复测 21 pass / 0 fail / 41 expect、运行态三端点 + seed 全通后，随本轮一并推送。

## 主线实测门禁

| 项 | 结果 |
|---|---|
| 根 `node node_modules/typescript/bin/tsc --noEmit` | exit 0 / 0B |
| web `bun x tsc --noEmit`（修复前） | exit 0 / 0B |
| web `bun x tsc --noEmit`（路由修复后复跑） | exit 0 / 0B |
| `bun test ./tests/unit/forensicExport.test.ts ./tests/integration/forensic-e2e.test.ts` | 23 pass / 0 fail / 40 expect（12 unit + 11 e2e） |
| 根 tsc（P5-1 落地后复跑） | exit 0 / 0B |
| `bun test qualityDashboard.test.ts + qualityDashboard-e2e.test.ts`（P5-1） | 21 pass / 0 fail / 41 expect（10 unit + 11 e2e） |
| 品牌硬禁词 17 词 Ordinal 扫描（src+web/src） | 9,793 文件 0 命中 |
| BFF 五健康端点 `/health` `/ready` `/metrics` `/api/v1/health` `/api/v1/system/health` | 全 200 |
| Vite 5173 首页 + 6 条关键路由实测 | 全 200 |
| 路由 lazy import 悬空 | 0（2,865 条） |
| 路由重复 path | 0（2,870 条声明 / 2,870 唯一） |

## 智能体进度

- `o_000Rfj7NkAk` 状态 finished，100%。自报 P4-4 已全绿待台账回填、P4-5 全链路完成（代码 + docs）。
- P0 七切片、P1 八切片、P2-1~P2-4、P3-1~P3-4、P4-1~P4-5 均已交付，处于 idle-resumable standby。
- 本轮已 `send_message` 唤醒续做 P5 切片，返回 `target_state=running`（消息已投递、组织侧开始运转）。派发方向候选：电子病历 6 级 / 互联互通五甲 / WORM 冷存储归档 / SIEM 对接 / Captcha / 按租户科室细分限流。

## 运行态

| 端口 | 状态 |
|---|---|
| 3000 | DOWN |
| 5173（Vite） | pid 11528，11-01 19:28 起，未重启 |
| 8080（BFF） | 巡检开始时 pid 46292（11-05 00:20:57 起）；为加载 P5-1 新路由重启后 pid 34776 |
| 8000 | DOWN |
| 9090 | DOWN |

工具链：node `v22.23.2`、bun `1.2.0`、npm `10.9.8`。

## 并发实例记录合并

本轮同一轮次有两个实例并行执行（每小时口径 `14538570498050` 与本两小时口径），并行实例先落了 40 行同轮简报 `7ab21633`，其结论与本轮一致（P4-5 复测全绿）。其中一条独有过程取证已并入本简报：

- 首次执行测试时用 `forensicExport-e2e.test.ts` 为文件名会报 ModuleNotFound，实际 E2E 文件名为 `tests/integration/forensic-e2e.test.ts`。本轮主线以 `Get-ChildItem tests -Recurse -Filter "*forensic*"` 先定位文件再执行，未踩该坑，两份文件实测 23 pass / 0 fail / 40 expect。

## 本轮追加：组织侧 P5-1 质量管理指标闭环独立复测

组织智能体在本轮巡检进行中（00:30:23）实时提交了 P5-1：`c680deb2` feat（+558 行）+ `9bbc3336` docs 台账回写。主线按纪律独立复测后才随本轮推送。

| 项 | 结果 |
|---|---|
| 根 tsc（P5-1 落地后） | exit 0 / 0B |
| `bun test qualityDashboard.test.ts + qualityDashboard-e2e.test.ts` | 21 pass / 0 fail / 41 expect（10 unit + 11 e2e） |
| 五健康端点（重启后） | 全 200 |
| `GET /api/v1/quality/dashboard/overview` | 200（未 seed 时 10 项指标全 0，seed 后 10 项全非零） |
| `GET /api/v1/quality/dashboard/by-doctor` | 200（seed 后 1 行） |
| `GET .../trend?metric=cdsHardStopRate` / `criticalValueClosedLoopRate` / `chiefRoundCompletionRate` | 全部 200，各 3 个日序列点 |
| `POST .../_seed`（DEMO_MODE） | code=0 |

取证细节两点：

1. 首次带 token 实测 trend 传了 `metric=cdsTotal` 返回 400。经查 `cdsTotal` 是 by-doctor 视图字段，trend 的 `METRIC_WHITELIST` 用的是扁平的 `cdsHardStopRate` 等 10 个 key。这是**测试参数用错，不是缺陷**；改正确 key 后 200。
2. BFF 原进程 pid 46292 启动于 00:20:57，早于 P5-1 提交（00:30:23），因此新路由未加载。按纪律重启 BFF（pid 34776）后三业务端点才可访问——这再次印证「组织侧自报端点全绿不可直接采信，必须按提交时间与进程启动时间比对后重测」。未 seed 前 overview 返回 401 是认证中间件正常拦截（非 404），证明路由已注册。

P5-1 指标口径：CDS hard-stop 率 / override 率、跌倒与压疮每千住院日、医嘱执行中位时长、危急值闭环率与 ack 中位时长、患者满意度均分、低分工单闭环率、主任查房完成率，共 10 项；权限为 admin 全量、doctor 不传 departmentId 看自己（显式传他科 403）、nurse 仅 overview。

## 本轮处理项：路由重复 path 清零

### 修复前取证

- `<Route path=...>` 声明 **3,070** 条，唯一 **2,869** 条 → **201 个重复 path**。
- 按"整行文本是否完全一致"分类：**164 组为同 path 同 element 的纯文本重复**（历史里程碑批次重复注册同一页面），**2 组为单行内的真冲突**。另经多行块补扫，追加发现 **1 组跨形态真冲突**（一组多行、一组单行），合计 3 处真冲突。

### 3 处真冲突判定与处置

| path | 声明 A | 声明 B | 处置 |
|---|---|---|---|
| `operation/dashboard` | `OperationDashboardM480Page`（新，M480） | `OperationDashboardPage`（旧，M323） | 保留 M480，删旧声明及其孤立 lazy const |
| `patients` | `RequirePermission permission="patient:view"` + `PatientList`（PC 端，带权限） | `MobilePatients`（移动端） | 保留 PC 带权限版；移动端改用独立路径 `mobile/patients`，死代码恢复可访问 |
| `emr/grade5` | `RequirePermission permission="emr_level5:view"` + `Grade5AssessmentPage` | `EMRGrade5V2`（无权限守卫） | 保留带权限守卫版（等保三级最小权限要求），删无守卫重复声明及其孤立 lazy const |

依据：React Router v6 同一父 `<Routes>` 下同 path 按声明顺序取首个匹配，后声明者永不渲染。故 `patients` 的移动端页与 `emr/grade5` 的无守卫版长期是死代码——医技人员从移动端进患者列表实际 404/回退，五级评审页缺权限包裹。两处均已修复。

### 修复动作

- 删除 200 行（198 冗余重复 + `operation/dashboard` 旧声明 + 其 lazy const）。
- 追加删除 2 行（`emr/grade5` 无守卫声明 + `EMRGrade5V2` 孤立 const）。
- `patients` 移动端改为 `mobile/patients`（1 行改动）。
- 合计：`web/src/router/index.tsx` 1 insertion / 203 deletions，行尾 CRLF 完整保持（10,679 行全 CRLF，无孤立 LF），编码 UTF-8 无 BOM 保持。

### 修复后复核

- route 声明 2,870 条 / 唯一 2,870 / 重复 0。
- lazy import 2,865 条，悬空 0。
- web tsc 复跑 exit 0 / 0B（`noUnusedLocals` 未因删 const 报错）。
- Vite 5173 实测 `/`、`/patients`、`/mobile/patients`、`/operation/dashboard`、`/emr/grade5`、`/login` 全 200；`/src/router/index.tsx` 模块经 Vite 转译成功（4.31MB），证明全部 import 可解析、语法有效。
- 原文件已备份 `logs/router-index-backup-1723.tsx.bak`（.gitignore 覆盖，不入库）。

## 仓库卫生

| 项 | 数值 |
|---|---|
| 根目录 `*.txt` | 1,361 |
| 根目录 `*.log` | 762 |
| `logs/` 文件数 | 2,945 |
| 已被 tracked 的 txt/log | **375**（pgsql 189 / reports 156 / docs 24 / services 3 / pgdata 1 / services-python 1 / web 1） |
| untracked 条目 | 352（主体为 `reports/consult-deepen/patrol-*`，属另一路 consult 任务产物） |

`.gitignore` 已覆盖 `logs/`（第 33 行）、`/*.txt`（第 113 行）、`*.log`（第 106 行）。但 375 个 txt/log 是 ignore 规则加入之前的历史入库文件，gitignore 对已跟踪文件不生效，属**遗留技术债**，本轮未处置（不扩大范围、不删用户历史产物，登记待专项清理）。

## 遗留风险与下一轮重点

1. **375 个 tracked txt/log 未清理**：需专项评估哪些是可安全 `git rm --cached` 的取证残留（多为 `docs/_m*_endpoints.txt`、`reports/` 巡检探针、`pgsql/` 数据库目录文本）。下一轮起逐目录判定，只取消跟踪不删工作区文件。
2. **P4-4 台账回填状态未核实**：组织侧自报"P4-4 待台账/commit/SHA 回填"，但随后已直接推进 P4-5 并做了 docs commit，是否仍欠账需下一轮对照 `docs/research/` 台账逐条核。
3. **移动端路由入口未验证**：`mobile/patients` 已恢复可访问，但移动端布局（是否独立 layout、是否有移动端菜单入口）尚未实测，下一轮抽样走一遍。
4. **组织侧 P5 方向未锁定**：已唤醒并给出 6 个候选方向，待其回摘要后确认切片编号与台账登记。
5. `gangos_` 存量指标名约 13 处，属专项 backlog，仍不计硬违规。

## 本轮分组 commit

共 3 组，均为本地提交，随本轮双推一起推向远端：

| commit | 类型 | 内容 |
|---|---|---|
| `c680deb2` | feat | P5-1 医疗质量管理指标闭环（组织侧交付，主线独立复测通过） |
| `9bbc3336` | docs | P5-1 台账回写（组织侧） |
| `78cfb07f` | fix | router 重复路由技术债清理（主线） |
| `aa7b4df1` | docs | 17:23 轮巡检简报（主线） |

另并入并行实例已落的同轮简报 `7ab21633` 其独有取证。

## 双仓推送与三端 SHA 核对方法

本轮按历史实际口径推送分支本体（`git push gitcode consult-agent-m86`、`git push mirror consult-agent-m86`），非任务文本所写 `consult-agent-m86:master`——历史各轮均按同名分支推送，改推 master 会在远端制造额外分叉，不在本轮授权范围。

推送纪律：两个 remote 不能共用同一 `GIT_SSH_COMMAND`，且环境变量不跨 PowerShell 调用继承，故「设变量 + push」必须同一次调用；gitcode 用 22 端口、mirror 走 443 端口。

核对判据：推送后分两次 `git ls-remote` 分别取两仓 `refs/heads/consult-agent-m86`，与本地 `git rev-parse HEAD` 逐位比对，三者完全一致才算三端对齐。**本轮最终 SHA 不在本简报内写死**，避免"为同步简报中的 SHA 再提交一次"的自我指涉循环；实际核对值由本轮巡检回复与下一轮简报记录。
