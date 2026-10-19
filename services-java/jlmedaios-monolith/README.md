# jlmedaios-monolith

健澜科技智慧医疗模块化单体（Spring Boot 3.5.3 + JDK 21 + Spring Modulith）。

## 项目简介

本工程是健澜科技智慧医疗核心交易层的模块化单体起步版本，端口 **9090**。
9 个业务模块通过包路径隔离（Spring Modulith 规则），模块间不互相 import，只通过 Controller 暴露 HTTP 接口。

## 前置要求

- JDK 21
- Maven 3.9+

## 本地启动

```bash
mvn spring-boot:run
```

访问健康检查：http://localhost:9090/actuator/health

H2 Console：http://localhost:9090/h2-console
- JDBC URL: `jdbc:h2:mem:monolith;DB_CLOSE_DELAY=-1`
- 用户名: `sa`
- 密码: （空）

## 跑测试

```bash
mvn test
```

## Docker 启动（生产环境）

```bash
docker compose up -d
```

包含 monolith + PostgreSQL 16 + Redis 7。

## 模块清单

| 包名 | 模块 | 说明 |
|---|---|---|
| `com.jlmedaios.monolith.reg` | 挂号 | 患者挂号登记 |
| `com.jlmedaios.monolith.charge` | 收费 | 门诊/住院收费 |
| `com.jlmedaios.monolith.orders` | 医嘱 | 医嘱开立/执行/取消 |
| `com.jlmedaios.monolith.pharmacy` | 药房 | 药品库存/发药核对 |
| `com.jlmedaios.monolith.empi` | 患者主索引 | 患者建档/查询（含 PHI 脱敏） |
| `com.jlmedaios.monolith.ward` | 住院床位 | 床位分配/释放 |
| `com.jlmedaios.monolith.lis` | 检验对接 | LIS 申请/结果（预留 HL7/FHIR） |
| `com.jlmedaios.monolith.nursing` | 护理执行 | 护理医嘱开立/执行 |
| `com.jlmedaios.monolith.discharge` | 出院结算 | 出院申请/结算 |
| `com.jlmedaios.monolith.encounter` | 诊疗沉淀 | 诊疗记录归档（append-only） |
| `com.jlmedaios.monolith.surgery` | 手术麻醉 | 手术排程/三方核对 |
| `com.jlmedaios.monolith.transfusion` | 输血管理 | 输血申请/八项核对 |
| `com.jlmedaios.monolith.antibiotic` | 抗菌药物 | 分级管理/药师审核 |
| `com.jlmedaios.monolith.emr` | 电子病历 | 病历创建/CA 签名/hash 链校验 |
| `com.jlmedaios.monolith.critical` | 危急值 | 危急值报告/接收/处置闭环 |
| `com.jlmedaios.monolith.followup` | 院后随访 | 随访计划/满意度评分 |
| `com.jlmedaios.monolith.quality` | 医疗质量 | 质量指标录入/评级/汇总 |
| `com.jlmedaios.monolith.admin` | 医务行政 | 人员档案/职称变更 |
| `com.jlmedaios.monolith.opdashboard` | 运营看板 | 日 KPI 导入/趋势 |
| `com.jlmedaios.monolith.nursing_record` | 护理文书 | 体温单/护理记录/交班报告 |
| `com.jlmedaios.monolith.clinical_pathway` | 临床路径 | 入径/推进/变异/退出 |
| `com.jlmedaios.monolith.insurance` | 医保 DRG/DIP | 结算申报/分组/汇总 |

## 合规红线

1. **append-only**：病历/医嘱类 entity（Register/Charge/Orders/NursingOrder/DischargeOrder）类注释标明 `append-only`，updatedAt 字段仅审计用
2. **@Sensitive PHI**：empi Patient entity 的 idCard/phone 字段加 `@Sensitive` 注解，序列化时需脱敏
3. **vLLM 本地 AI**：`common/AiClientConfig.java` 统一走本地 vLLM `http://127.0.0.1:8000/v1`，禁止境外大模型 API 调用

## 生产部署提示

- 开发阶段：H2 内存库（`jdbc:h2:mem:monolith`），schema.sql + data.sql 自动初始化
- 生产阶段 1：切 PostgreSQL 16（Flyway 迁移脚本 `V1__init.sql` 已备好，`spring.flyway.enabled=false` 改 true）
- 生产阶段 2：切达梦信创（application.yml 已预留注释切换点）
- 监控：actuator 暴露 `health,info,prometheus`，生产接 Prometheus + Grafana
