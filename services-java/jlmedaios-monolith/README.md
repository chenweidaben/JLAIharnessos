# jlmedaios-monolith

健澜科技 jlmedaios 模块化单体旁路/参考实现（Spring Boot 3.5.3 + JDK 21 + Spring Modulith）。

## 角色边界

- 本工程为 **Java 旁路/参考**，不进入主线默认 compose 编排；主线为 Bun + TypeScript BFF（`src/bff/`）+ React 工作台（`web/`）。
- 主仓库 `docker-compose.yml` 中对应服务 `jlmedaios-monolith` 归入 `legacy` profile，需显式 `--profile legacy` 启动；容器内端口 **9090**，宿主映射 `127.0.0.1:19090`（避免与 Prometheus 回环 9090 冲突）。
- 本机未安装 Maven，本工程**未能在本机独立构建/测试**；需在具备 JDK 21 + Maven 3.9+ 的环境执行 `mvn clean install`。

## 项目简介

本工程是核心交易层模块化单体的参考起步版本：各业务模块通过包路径隔离（Spring Modulith 规则），模块间不互相 import，只通过 Controller 暴露 HTTP 接口。

实测规模（2026-10 本机命令统计，仅作规模参考）：

| 口径 | 数值 |
|---|---|
| 主源码 `.java` | 650 |
| 测试 `.java` | 117 |
| `.java` 合计 | 767 |
| 一级包目录（`com.jlmedaios.monolith.*`） | 143（含 `common`/`config`/`security`/`openapi` 等基础设施包） |
| `*Controller.java` | 142 |

> 下表为**代表性模块清单**，不是全量包清单；全量包结构以 `src/main/java/com/jlmedaios/monolith/` 目录为准。

## 前置要求

- JDK 21
- Maven 3.9+

## 本地启动

```bash
mvn spring-boot:run
```

本地开发健康检查：http://localhost:9090/actuator/health

H2 Console：http://localhost:9090/h2-console
- JDBC URL: `jdbc:h2:mem:monolith;DB_CLOSE_DELAY=-1`
- 用户名: `sa`
- 密码: （空）

## 跑测试

```bash
mvn test
```

## Docker 构建与编排

`Dockerfile` 为单阶段 `COPY target/*.jar`：必须先在宿主机完成 `mvn -DskipTests package` 生成 `target/*.jar`，镜像构建依赖该产物；多阶段 Maven 构建列入待办。

```bash
# 仓库根目录，随主线 legacy 旁路启动（依赖主线 postgres / redis 健康状态）
docker compose --profile legacy up -d jlmedaios-monolith
```

## 代表模块清单

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
- 待办：temurin 21-jre 运行镜像未内置 wget/curl，compose 单体健康检查探针命令待镜像补齐工具后落地；当前以 `depends_on(postgres/redis healthy)` 作为启动前置条件
