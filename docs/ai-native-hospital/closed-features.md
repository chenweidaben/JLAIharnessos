# 已闭环功能清单（M17–M23）

> 本文档登记 v0.17.0-m17a ～ v0.41.0-m23f 已交付切片，按三域分组。每个模块一句话能力 + 对应 tag。
> 所有切片均：幂等迁移真实落 PostgreSQL、纯函数可单测、repo CAS 状态机、aggregator 复用 canAccessVisit 越权 403、统一错误信封+traceId、tsc 双零、双远程 SSH 推送并打注解 tag、ls-remote 三方一致。

## 一、护理线（住院护理闭环）

| 模块 | 能力 | tag |
|---|---|---|
| 压疮/跌倒风险预警 | Braden/Morse 评分→高危评估→无预防即预警→护士本人签名执行预防→结局事件登记 | v0.17.0-m17a（v0.17.1-m17a-hotfix 空 uuid 500 热修） |
| 给药三查七对（MAR） | 五对逐项核对+高危药双人核对+CDS 拦截 override 留痕+本人电子签名+幂等防重放 | v0.18.0-m17b |
| 管路护理与非计划拔管 | 置入/每日评估/planned-unplanned 拔管 CAS，非计划必填说明，NQI 非计划拔管率 | v0.19.0-m17c |
| 不良事件后结构化评估 | 跌倒后必填项校验+压疮分级，NQI 压疮/跌倒发生率闭环 | v0.20.0-m17d |
| 出入量 I&O | intake/output 分类录入，24h 平衡与三班（06-14/14-22/22-06）汇总 | v0.21.0-m17e |
| 医嘱开方 CDS override | 开方层过敏/重复活跃医嘱/剂量范围/频次规则，hard 拦截须医生填 override_reason 才放行 | v0.22.0-m18a |
| 护士站四合一屏 | 床旁一览聚合：床号/最新体征/24h 出入量/待给药/在院管路/风险等级/未处理 hard CDS | v0.23.0-m18b（v0.23.1-m18b-perm 补权限码迁移） |
| 入院营养风险筛查 NRS-2002 | 营养状态/疾病严重度/年龄≥70 加分，总分≥3 判风险，建议营养科会诊 | v0.47.0-m29a |
| NRS 疼痛评估 | 0-10 滑块分级 mild/moderate/severe，≥4 分触发镇痛建议与再评估间隔 | v0.48.0-m29b |
| 营养/疼痛阳性自动工单 | risk=true / score≥4 时同事务幂等建 clinical_improvement_tasks（source=nutrition/pain）分派主治 | v0.49.0-m29c |
| 单患者护理评估汇总屏 | GET /:visitId/evaluations 聚合营养/疼痛/风险/工单 flags 与 needsAttention | v0.50.0-m30a |
| 术前访视 ASA 分级 | ASA I-VI + 禁食水/过敏史/知情同意三项确认，缺项标红、≥III 高风险 | v0.51.0-m31a |
| PACU Aldrete 复苏记录 | 五项 0-2 打分为 Aldrete 0-10，≥9 可出室，苏醒延迟提示 | v0.52.0-m31b |
| 术后 6/24/48h 镇痛随访 | 自动生成三时间点 due_at，完成记 NRS，≥4 自动转镇痛工单 | v0.53.0-m31c |
| 麻醉异常自动工单 | 术前三项缺失 / PACU Aldrete 不可出室 → source=anesthesia 工单（幂等） | v0.54.0-m31d |
| 护士屏手术麻醉块 | evaluations 聚合术前完成度/最新 Aldrete/术后随访待办/麻醉告警 open 工单数 | v0.55.0-m32a |
| ICU RASS 镇静评分 | -5~+4 分级，目标 ±1 达标判定，过深 ≤-3 提示 | v0.56.0-m33a |
| 镇静异常自动工单 | RASS ≤-3 过深或 ≥+2 躁动 → source=icu_sedation 工单（幂等） | v0.57.0-m33b |
| 产后 1/2/3 天访视 | 母乳喂养 0-3 + 黄疸 TcB 按日阈值（6/9/12）+ 可视范围 | v0.58.0-m34a |
| 产后异常工单+屏聚合 | 黄疸 elevated/喂养不足自动建 source=postpartum 工单；evaluations 加 icu/postpartum 块 | v0.59.0-m34b |
| 急诊预检分诊五级 | SBP<90/SpO2<90/GCS<9→I，HR>120/RR>30→II，I/II 自动绿色通道 | v0.60.0-m35a |
| Barthel ADL 指数 | 10 项 0-100 分五档分级（independent/mild/moderate/severe/total） | v0.61.0-m35b |
| Barthel<40 康复自动工单 | 总分<40 自动建 source=rehab 康复介入工单（幂等） | v0.62.0-m36a |
| 急诊绿色通道超时催办 | I>10min/II>30min 自动建 source=er_green 催办工单（幂等） | v0.63.0-m37a |
| 护士屏急诊/Barthel块 | evaluations 聚合最新分诊 level/green_channel + 最新 Barthel total/dependency | v0.64.0-m38a |

## 二、互联网医院（智慧服务三级）

| 模块 | 能力 | tag |
|---|---|---|
| 号源排班与分时段预约 | 医生排班→批量时段→号池 row-lock 占号不超卖、取消退号回补 | v0.24.0-m19a |
| 检查报告患者推送 | 报告审核后一键推送患者端，患者查看回执 view_count 累加，非本人 403 | v0.25.0-m19b |
| 约号打通 appointments | 占号同事务写 clinical.appointments 生成 appointment_no，退号 CAS cancelled | v0.26.0-m19c |
| 患者通知中心 | 报告推送/约号确认经 outbox→WS 实时触达，未读铃铛+点已读 | v0.27.0-m20a |
| 在线问诊续方流转 | 已结束会话→医生续方→患者支付→配药取药端到端编排 | v0.28.0-m21a |
| 支付回调药房配药 | 支付成功自动建 pending 配药任务+患者通知，药师完成→ready_dispense | v0.29.0-m21b |

## 三、医保精细化管理（DRG/DIP 双轨）

| 模块 | 能力 | tag |
|---|---|---|
| DRG 病组预算超支预警 | 病组预算表+实际费用对照，超 warning_ratio 建 warn/over 告警可确认 | v0.30.0-m22a |
| 在院事中费用滚动监控 | 在院病例按日累计 vs 预算红黄预警列表，出院前费用合理性提醒（幂等） | v0.31.0-m22b |
| 超支成本归因明细 | 按药品/检查/检验/耗材/治疗/床位/护理拆分超支贡献度并排序 Top 类别 | v0.32.0-m22c |
| 整改任务闭环 | 归因→一键建整改单分派主治医师→认领/处理/提交解决→质控验证闭环 | v0.33.0-m22d |
| 整改效果回看（PDCA Check） | 整改关闭后统计 baseline vs followup 超支率，判定 effective/partial/no_improvement/worse | v0.34.0-m22e |
| 整改无效自动升级 | verdict=worse/no_improvement 自动建二级升级单关联上级医师复评 | v0.35.0-m22f |
| DIP 分值点值体系 | packet score 库+月度点值=基金池/总分值，病例结算=score×pointValue | v0.36.0-m23a |
| DRG/DIP 双轨选组 | 同病例双轨算更优支付自动落组（auto_drg/auto_dip）+医保办人工 override | v0.37.0-m23b |
| 月度结算对账报表 | 全院月度汇总（DRG/DIP 病例数/总分值/点值/医保结算/自付）+CSV 导出 | v0.38.0-m23c |
| 同比环比驾驶舱 | 结算总额 MoM/病例结构占比（drgRatio/dipRatio）趋势分析 | v0.39.0-m23d |
| 科室医生绩效下钻 | 按科室/主治聚合结算总额/超支率/药占比排名，admin 全院/医生本科室 | v0.40.0-m23e |
| DIP 接入事中监控 | DIP 落组在院病例预算=score×当月点值，同走事中红黄预警+DRG/DIP 徽标 | v0.41.0-m23f |

## M29-M41 追加

| 模块 | 能力 | tag |
|---|---|---|
| 急诊绿色通道催办 | I>10min/II>30min 自动建 source=er_green 工单 | v0.63.0-m37a |
| 护士屏急诊/Barthel块 | evaluations 聚合最新分诊 + Barthel 等级 | v0.64.0-m38a |
| 慢病管理 | 高血压/糖尿病随访+达标判定+异常自动工单 | v0.65.0-m39a |
| 患者端慢病视图 | 患者本人 token 只读查看趋势与下次随访 | v0.66.0-m39b |
| 体检中心 | 套餐/开单/逐项完成/报告推送 | v0.67.0-m40a |
| 体检异常转诊 | 异常项自动映射科室+推荐门诊预约 | v0.68.0-m40b |
| 肿瘤随访 | 化疗周期+CTCAE grade>=3 自动工单 | v0.69.0-m41a |

## M43-M44 追加

| 模块 | 能力 | tag |
|---|---|---|
| 化疗 T-1 通知 | 明日化疗周期自动扫描并发患者提醒 | v0.71.0-m43a |
| PHQ-9/GAD-7 筛查 | 抑郁焦虑 16 项评分+重度自动心理科工单 | v0.72.0-m44a |
| 护士屏心理块 | evaluations 聚合最新 PHQ9/GAD7 重度标红 | v0.73.0-m44b |

## M45-M46 追加

| 模块 | 能力 | tag |
|---|---|---|
| NISS 院感上报 | SSI/CRBSI/CAUTI/肺炎上报+状态流转 | v0.74.0-m45a |
| VTE 抗凝追踪 | 抗凝疗程+出血评分+高出血工单 | v0.75.0-m46a |
| 院感自动工单 | SSI/CRBSI/CAUTI 自动建 source=infection 工单 | v0.76.0-m46b |
| 护士屏 VTE/院感块 | evaluations 聚合最新抗凝+active 院感 | v0.77.0-m46c |

## M50-M53 追加

| 模块 | 能力 | tag |
|---|---|---|
| 患者端费用视图 | 住院费用按类汇总+医保自付预估+押金余额 | v0.78.0-m50a |
| 康复治疗执行 | 开单->签到->疗效评定；fair/poor 自动建 source=rehab 复评工单 | v0.79.0-m51a |
| 疼痛门诊滴定 | NRS 滴定+爆发痛计数+镇痛建议；NRS>=7 或爆发痛>=3 自动建 source=pain 工单 | v0.83.0-m52a |
| 护士屏康复/疼痛块 | evaluations 聚合最新治疗疗效与疼痛 NRS，poor/NRS>=7 标红 | v0.84.0-m53a |

## M56-M57 追加

| 模块 | 能力 | tag |
|---|---|---|
| 老年综合评估 CGA | ADL/IADL/MMSE/MNA/GDS+跌倒 六维评分分级，high 自动 quality_safety 工单 | v0.87.0-m56a |
| 护士屏 CGA 块 | evaluations 聚合最新 CGA，high 风险标红 | v0.88.0-m57a |

## M58-M60 追加

| 模块 | 能力 | tag |
|---|---|---|
| 营养科会诊执行 | 会诊方案分级+随访到期提醒 | v0.89.0-m58a |
| STOP-BANG 睡眠筛查 | 8 项打分，>=3 自动睡眠监测工单 | v0.90.0-m59a |
| 护士屏营养/睡眠块 | evaluations 聚合最新营养会诊与 STOP-BANG，高能量/OSA 高危标红 | v0.91.0-m60a |

## M61-M64 追加

| 模块 | 能力 | tag |
|---|---|---|
| 出院计划随访 | 出院指导+用药摘要+复诊建议，推送患者端通知 | v0.92.0-m61a |
| 复诊号源预约 | 复用 M19 号源，基于出院计划推荐号源一键占用 | v0.93.0-m62a |
| 患者满意度调查 | 4 维度 5 分制+科室汇总排名+低分维度标红 | v0.94.0-m63a |
| 满意度提醒推送 | reminder_stage 幂等 first/second 推送 M20 通知中心 | v0.95.0-m64a |

## M66-M69 追加

| 模块 | 能力 | tag |
|---|---|---|
| MDT 多学科会诊 | 医生发起->选科室排期->录纪要->结论，状态机 requested->scheduled->held->concluded | v0.97.0-m66a |
| MDT 转治疗方案 | concluded 后按科室/结论推断方案类型生成草稿->主治确认 confirmed+排程 | v0.98.0-m67a |
| PICC/输液港维护 | 维护记录录入+到期提醒(>7d)+并发症(血栓/感染)告警 | v0.99.0-m68a |
| 护士屏 PICC 块 | evaluations 聚合最新 PICC 装置/维护日期/到期/并发症标红 | v1.00.0-m69a |
| 合理用药审查 CDI | 药物相互作用/过敏/剂量审查，block 级自动拦截并记录 | v1.01.0-m70a |
| 输血不良反应监控 | 反应登记+严重度判定，溶血/重度自动建 quality_safety 工单并阻断后续输血 | v1.02.0-m71a |
| 院内转运交接 SBAR | 四段完整性+状态机 pending->received->closed，未接收不能关闭 | v1.04.0-m73a |
| 急诊留观登记 | 分诊分级登记+滞留计时，observing>24h 自动建 er_green 预警工单 | v1.05.0-m74a |
| 院内感染监测看板 | 月度手卫生/CAUTI/VAP/CLABSI/SSI 指标录入+科室感染率排名+超阈值标红 | v1.07.0-m76a |
| 合理用药统计看板 | 月度 DDDs/抗菌药使用率/特殊级占比/围术期合理率+DDDs 排名+超阈值标红 | v1.08.0-m77a |
| 医生站首页工作台 | one-screen 聚合待办工单/未读通知/急诊在观/待确认方案/本月院感用药 KPI 红黄分级 | v1.10.0-m79a |
| 患者端首页门户 | 患者侧聚合复诊/未读报告/未读通知/押金余额/慢病随访/满意度待填，自限域患者角色 | v1.11.0-m80a |
