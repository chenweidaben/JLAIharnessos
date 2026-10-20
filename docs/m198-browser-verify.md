# M198 多角色浏览器实测 + 空数据页面补全报告

- 执行时间：2026-10-19
- 环境：DEMO_MODE=1，BFF=8080，Vite=5173，bun run src/bff/server.ts
- 仓库：jlmedaios（Windows PowerShell）
- 约束：不 git、不新增依赖、不删业务代码

---

## 1. 三角色登录测试结果

登录入口：`http://localhost:5173/login`，密码 `123456`，验证码任意（DEMO 放行）。

| 角色 | 工作台路由 | 验证点 | 结果 | 截图 |
|---|---|---|---|---|
| doctor_li | `/doctor-workbench` | 待诊队列非空 | ✅ 通过：待诊 6 人（王建国/李秀英/张伟/陈丽华/刘德海/赵敏），今日手术 6 台，待审医嘱 6 条 | `artifacts/m198/doctor_workbench.png` |
| nurse_wang | `/nurse-station` | 在院患者非空 | ✅ 通过：在院 8 床（08床 王*英 冠心病/11床 刘*梅 糖尿病酮症/10床 张*华 肺炎 等），性别/年龄/护理级别/床位号齐全 | `artifacts/m198/nurse_station.png` |
| pharmacist_zhang | `/pharmacy` | 待审处方非空 | ✅ 通过：待发药 8、待审方 8、用药提醒 5，处方列表可展开 | `artifacts/m198/pharmacy.png` |

登录流程实测：账号密码 + 验证码提交后 3s 内跳 `/dashboard`，顶部显示「欢迎回来，<角色名>」，token 落 localStorage。三角色均一次通过，无需重复登录。

---

## 2. 空数据页面清单（修复前 → 修复后）

巡检方式：doctor_li 登录后，按侧边栏导航 + 路由直访核心 30 个菜单，记录所有「暂无数据 / 暂无记录 / 白屏 / 短文本」页面。

### 2.1 本次修复的 6 个空数据页面

| # | 路由 | 页面标题 | 修复前 | 根因 | 修复文件 | 修复后 |
|---|---|---|---|---|---|---|
| 1 | `/research` | 科研队列·专病队列 | 队列列表 (0) | `listResearchCohorts` 直连 DB，DEMO 库无队列行 | `src/bff/aggregators/researchAggregator.ts` | 4 条队列（冠心病/2型糖尿病/肺炎/脑卒中） |
| 2 | `/empi` | 患者主索引 EMPI | 匹配候选 (0) + 主索引链接 (0) | `listMatchCandidates`/`listEmpiLinks` 直连 DB 返回 [] | `src/bff/aggregators/empiAggregator.ts` | 候选 3 + 链接 3 |
| 3 | `/appt` | 预约随访 | 预约队列 (0) + 随访计划 (0) | `listAppointments`/`listFollowUpPlans` 直连 DB 返回 [] | `src/bff/aggregators/apptAggregator.ts` | 预约 4 + 随访计划 3 |
| 4 | `/satisfaction` | 满意度评价 | 评价明细 (0)，统计全 0 | `listSurveysForStaff`/`getSatisfactionStats` 直连 DB 返回 [] | `src/bff/aggregators/satisfactionAggregator.ts` | 统计 128 条/均分 4.60 + 明细 4 |
| 5 | `/referral` | 双向转诊 | 「路由不存在」404 toast + 转诊单列表空 | 前端调 `GET /api/v1/referrals`，BFF 仅注册了 `/referral/incoming`，路径复数/单数不匹配；且返回结构与前端 `ReferralOrder` 字段不一致 | `src/bff/routes/referral.ts` | 转诊队列 4（转入 2 / 转出 2，含急诊 1） |
| 6 | `/nursing/handoff` | 护理交接班 | 交班本列表 (0) | 路由层硬编码 `if (isDemo) return json(ok([]))` 直接空兜底 | `src/bff/routes/nurseHandoff.ts` | 交班本 3（白/中/夜三班，摘要完整） |

### 2.2 其他观察项（非空数据 bug，记录备查）

- `/doctor-workbench` 右侧「科室 KPI（红黄标红）」子表格显示「暂无数据」——该子表依赖独立 KPI 聚合接口，本次未在 30 菜单核心范围内，留待 M199 补。
- `/billing` 用 doctor_li 访问返回 403「无账单查看权限」——这是权限隔离的预期行为（doctor_li 无 billing:view），非空数据 bug。
- 早期巡检中出现的 len=22 白屏路由（`/medicalQc` `/voiceMedical` `/frontPage` `/dataWarehouse` `/dataGovernance` `/smartTriage` `/digitalCompanion` `/knowledgeBase` `/internetHospital` `/internetPrescription` `/internetDelivery` `/internetReports`）经核实均为本次直访猜测的 URL 未注册到路由表（页面标题显示「404 Not Found」），**不是真实菜单项**，不计入空数据清单。

---

## 3. 修复前 vs 修复后空数据页数

| 指标 | 修复前 | 修复后 |
|---|---|---|
| 核心 30 菜单中显示「暂无数据/暂无记录」的业务页面 | 6 | 0 |
| 其中根因为「聚合器缺 DEMO mock」 | 5 | 0 |
| 其中根因为「前端/BFF 路由不匹配」 | 1（referral） | 0 |
| 白屏 / 崩溃页（含 404 toast） | 1（referral rawData.some 崩溃） | 0 |

修复手法统一遵循 `nurseStationAggregator`/`surgeryAggregator`/`transfusionAggregator` 既有范式：在 list 类聚合函数入口加 `if (process.env.DEMO_MODE === '1') { return <确定性演示数组> }` 早返回，不写库、不影响生产路径；referral 额外补了一个 `GET /api/v1/referrals` 兼容路由（按前端 `ReferralOrder` 契约整形）。

---

## 4. UI bug 清单（本次实测）

| 严重度 | 页面 | 现象 | 是否本次修复 |
|---|---|---|---|
| 低 | `/research` | 表格上方斜向水印「科研专病队列 · jlmedaios」半透明覆盖表头，不影响阅读 | 否（设计如此） |
| 低 | `/appt` | 新建预约表单「患者ID」占位符显示 `clinical.patients.id`，是模板残留未替换 | 否（非空数据类，留待后续） |
| 低 | `/satisfaction` | 「好评率」双口径并排（0.9% 与 0.91%）——一个是百分比数值、一个是比率数值，标签易混淆 | 否 |
| 观察 | 全部主框架 | 侧边栏、顶栏、面包屑布局无错位；主要按钮（刷新/新建/确认/拒绝/登记）均可点；文字无溢出 | — |

未发现：布局错位、按钮不可点、文字溢出、控制台红错（除 referral 修复前的 404 toast）。

---

## 5. 业务域健康度评分

按域打分（满分 10，基于本次实测的核心菜单数据饱满度 + 三角色主流程可用性）：

| 业务域 | 评分 | 依据 |
|---|---|---|
| 门诊接诊 / 医生工作台 | 9 | 待诊 6、手术 6、医嘱 6，KPI 子表待补 |
| 住院护理 / 护士站 | 9 | 在院 8、交班本 3、床位信息齐 |
| 药学 / 药房 | 9 | 待发药 8、待审方 8、用药提醒 5 |
| 科研专病队列 | 8 | 队列 4 已补，成员明细需点入 |
| 患者主索引 EMPI | 8 | 候选 3 + 链接 3 |
| 预约随访 | 8 | 预约 4 + 随访 3 |
| 满意度评价 | 8 | 统计 128 + 明细 4 |
| 双向转诊 | 8 | 转诊 4，三态齐全 |
| 互联网医院 / 数据仓库 / AI 辅诊等 | — | 未在本次 30 菜单核心巡检范围，留待后续轮次 |

**综合健康度：8.3 / 10**（三角色主链路全部跑通，核心空数据页清零；剩余扣分项为子表 KPI 与未巡检域）。

---

## 6. tsc 双零验证

```
npx tsc --noEmit                      (根)  → exit 0 ✅
npx tsc --noEmit -p web/tsconfig.json (web)  → exit 0 ✅
```

过程中修过一次类型错误：`Appointment.status` 联合类型为 `'scheduled'|'confirmed'|'completed'|'absent'|'cancelled'`，初版 demo 误用 `'pending'`，已改为 `'scheduled'` 后通过。

---

## 7. 改动文件清单（仅 BFF 侧，未动前端业务代码）

1. `src/bff/aggregators/researchAggregator.ts` — `listResearchCohorts` 加 DEMO 分支（4 队列）
2. `src/bff/aggregators/empiAggregator.ts` — `listMatchCandidates`/`listEmpiLinks` 加 DEMO 分支（3+3）
3. `src/bff/aggregators/apptAggregator.ts` — `listAppointments`/`listFollowUpPlans` 加 DEMO 分支（4+3）
4. `src/bff/aggregators/satisfactionAggregator.ts` — `listSurveysForStaff`/`getSatisfactionStats` 加 DEMO 分支（4 明细 + 128 统计）
5. `src/bff/aggregators/referralAggregator.ts` — 模块加载时播种 4 条演示转诊单（三态/三方向）
6. `src/bff/routes/referral.ts` — 新增 `GET /api/v1/referrals` 兼容路由，按前端 `ReferralOrder` 契约返回
7. `src/bff/routes/nurseHandoff.ts` — DEMO 空兜底改为返回 3 条结构化交班本

截图归档：`artifacts/m198/`（doctor_workbench.png / nurse_station.png / pharmacy.png / fixed_*.png 共 10 张）。
