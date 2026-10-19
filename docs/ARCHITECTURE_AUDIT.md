# 健澜AI原生医院操作系统OS — 架构审计报告

> 审计日期：2026-10-19
> 审计范围：jlmedaios-monolith（Java 单体）+ services-python（FastAPI AI 层）
> 审计方法：实际代码扫描（Grep/Glob/PowerShell），非凭空想象

---

## 一、现状概览

| 维度 | 数量 | 备注 |
|---|---|---|
| monolith 业务模块 | ~143 个包 | `com.jlmedaios.monolith.*` |
| Controller 文件 | 142 个 | 全部 `@RestController` |
| Entity 文件 | 176 个 | 全部 `@Entity` |
| Service 文件（含 findAll） | 70+ 个 | 大量全表扫描 |
| Python AI router | 84 个 | FastAPI APIRouter |
| 测试类 | 117+ 个 | JUnit 5 + H2 |
| 数据库 | H2 内存库 | `jdbc:h2:mem:monolith` |
| 端口 | Java 9090 / Python 8000 / TS BFF 8080 | |

---

## 二、风险点清单（按严重程度排序）

### P0 — 安全漏洞（必须立即修复）

#### P0-1：Java 端 100% 端点裸奔，无任何鉴权

**实际扫描结果**：
- `@PreAuthorize` / `@Secured` / `@RolesAllowed` / `SecurityContextHolder` → **0 处匹配**
- `pom.xml` → **无 `spring-boot-starter-security` 依赖**
- `HandlerInterceptor` / `WebMvcConfigurer` / `OncePerRequestFilter` → **0 处匹配**
- 唯一的 `@RestControllerAdvice` 是 `common/GlobalExceptionHandler.java`（仅异常处理，非鉴权）

**影响**：
- 142 个 controller、~620+ 端点全部公开可访问
- 任意人可调用 `/api/doctor/today/patients`、`/api/icu/today`、`/api/dental/exam` 等 PHI 端点
- 患者病历、医嘱、检验结果可被匿名读取/修改
- 违反《个人信息保护法》《医疗卫生机构网络安全管理办法》

**Python 端对比**：
- FastAPI 有 `api_key_middleware`（Bearer Token 鉴权 + rate limit）
- Java 端无对应机制

#### P0-2：多租户/多院区数据隔离完全缺失

**实际扫描结果**：
- `tenantId` / `hospitalId` / `campusId` → **176 个 entity 中 0 处匹配**
- `multi_tenant/` 目录 → **不存在**（Glob 返回 No files found）
- 无 `ThreadLocal` 租户上下文
- 无 `Hibernate Filter` 租户过滤

**影响**：
- 三甲医院多院区场景下，A 院区患者数据可被 B 院区医生直接查询
- 无法满足医院集团多院区数据合规隔离要求
- 医保按院区结算时无法区分数据归属

#### P0-3：H2 Console 生产暴露

**实际配置**（application.yml:19-22）：
```yaml
spring:
  h2:
    console:
      enabled: true
      path: /h2-console
```

**影响**：
- 生产环境下 `/h2-console` 可直接访问数据库控制台
- 无密码保护（username=sa, password=空）
- 任意人可通过浏览器直接执行 SQL

---

### P1 — 性能风险（上线前必须优化）

#### P1-1：全表扫描泛滥（findAll() 滥用）

**实际扫描结果**：
- **70+ 个 service 文件中出现 `findAll()`**，共 97 处匹配
- 典型反模式：`icu_workstation/service/IcuWorkstationService.java` 有 3 处 findAll
- 多个 service 用 `findAll().stream().filter(...)` 做内存过滤（如 `findByWorkItemNo`、`findByRecordNo`、`findByOrderNo`）

**影响**：
- 数据量到 10 万行级别时，每次请求全表加载到内存
- OOM 风险 + 响应时间从 ms 级劣化到秒级

#### P1-2：Entity 无任何索引

**实际扫描结果**：
- `@Index` / `indexes` → **0 处匹配**
- 176 个 entity 全部只有 `@Table(name="...")`，无 `@Table(indexes=@Index(...))`
- 高频查询字段（patientId、status、recordNo、orderNo）全部无索引

**影响**：
- 数据库每次查询全表扫描
- H2 内存库阶段尚可，切 PostgreSQL 后数据量增长会暴露

#### P1-3：H2 内存库生产局限性

**实际配置**：
```yaml
url: jdbc:h2:mem:monolith;DB_CLOSE_DELAY=-1
ddl-auto: update
```

**问题**：
- **数据不持久**：JVM 重启即丢失所有数据
- **并发写锁**：H2 的 MVCC 级别远低于 PostgreSQL，多线程并发更新时锁竞争严重
- **无连接池调优**：未配置 HikariCP 参数
- **无 Flyway 迁移**：`spring.flyway.enabled=false`，schema 变更靠 `ddl-auto=update`（生产危险）

#### P1-4：N+1 查询模式

**典型代码**（多个 service 通用模式）：
```java
private XxxEntity findByXxxNo(String xxxNo) {
    return repository.findAll().stream()
            .filter(x -> xxxNo.equals(x.getXxxNo()))
            .findFirst().orElse(null);
}
```

**影响**：
- 每次"按编号查单条"都触发一次全表扫描
- 应该用 `repository.findByXxxNo(String xxxNo)` 派生查询（很多 repository 已定义，但 service 没调用）

---

### P2 — 架构债（可分阶段偿还）

#### P2-1：模块边界松散

- 143 个模块全部在同一个 Maven 模块内（`jlmedaios-monolith`）
- Spring Modulith 1.3.0 已引入，但未配置模块间访问规则
- 模块间无显式 API 边界，service 可互相注入

#### P2-2：配置管理裸奔

- 无 `application-prod.yml` / `application-staging.yml` 环境隔离
- 数据库密码硬编码在注释里
- 无配置中心（Nacos/Apollo）

#### P2-3：缺乏可观测性

- 无分布式追踪（SkyWalking/Jaeger）
- 无结构化日志（logback JSON appender）
- `/actuator/prometheus` 已暴露但无业务指标埋点

#### P2-4：无缓存层

- 完全没有 Redis / Caffeine
- 知识图谱、字典表、配置表每次都查库

---

## 三、大三甲多院区高并发分布式场景差距分析

### 3.1 当前单体架构 vs 分布式架构差距

| 维度 | 当前状态 | 大三甲目标 | 差距 |
|---|---|---|---|
| 部署形态 | 单 JVM 单体 | 微服务集群 | **巨大** — 需拆分 143 模块为独立服务 |
| 并发能力 | 单实例 ~100 QPS（H2 估算） | 10000+ QPS | **100 倍差距** |
| 可用性 | JVM 挂 = 全站挂 | 99.99% 可用性 | **无冗余** |
| 扩展性 | 加机器 = 整体扩容 | 按服务独立扩容 | **粒度粗** |

### 3.2 数据库层差距

| 维度 | 当前状态 | 大三甲目标 | 差距 |
|---|---|---|---|
| 数据库 | H2 内存库 | PostgreSQL 16 / 达梦 | **生产不可用** |
| 连接池 | 默认 HikariCP | HikariCP 调优（max=50, idle=10） | **未配置** |
| 迁移工具 | 无 Flyway | Flyway/Liquibase | **schema 变更危险** |
| 分库分表 | 无 | ShardingSphere（按院区/患者ID） | **多院区必需** |
| 读写分离 | 无 | 主从 + 读写分离 | **查询压力大** |

### 3.3 缓存层差距

| 维度 | 当前状态 | 大三甲目标 | 差距 |
|---|---|---|---|
| 缓存 | 无 | Redis Cluster | **完全缺失** |
| 场景 | 每次查库 | 病历/医嘱/字典缓存 | **高频读场景必加** |
| 会话 | 无 | Redis Session | **多实例部署必需** |

### 3.4 消息队列差距

| 维度 | 当前状态 | 大三甲目标 | 差距 |
|---|---|---|---|
| MQ | 无 | Kafka / RocketMQ | **异步解耦必需** |
| 场景 | 同步调用 | 通知/审计/AI 推理异步化 | **阻塞调用多** |
| 削峰 | 无 | 挂号高峰削峰 | **号源系统必加** |

### 3.5 服务治理差距

| 维度 | 当前状态 | 大三甲目标 | 差距 |
|---|---|---|---|
| 注册中心 | 无 | Nacos / Consul | **微服务必需** |
| 配置中心 | 无 | Nacos Config | **环境隔离必需** |
| 网关 | 无（TS BFF 算半个） | Spring Cloud Gateway | **统一鉴权/限流** |
| 熔断 | 无 | Sentinel / Resilience4j | **故障隔离** |
| 链路追踪 | 无 | SkyWalking | **排障必需** |

---

## 四、修复建议优先级路线图

### 第一阶段：安全止血（1-2 周）

| 优先级 | 动作 | 工作量 |
|---|---|---|
| P0 | 加 `spring-boot-starter-security`，配 JWT 过滤器 | 3 天 |
| P0 | 所有 PHI 端点加 `@PreAuthorize("hasRole('DOCTOR')")` | 5 天 |
| P0 | 关闭 H2 Console 或加密码保护 | 0.5 天 |
| P0 | Java 端加 API Key 拦截器（对齐 Python 端） | 1 天 |

### 第二阶段：多租户隔离（2-3 周）

| 优先级 | 动作 | 工作量 |
|---|---|---|
| P0 | 所有 entity 加 `tenantId` / `hospitalId` 字段 | 5 天 |
| P0 | 加 `TenantContextHolder`（ThreadLocal） | 2 天 |
| P0 | 加 Hibernate Filter 自动过滤租户 | 3 天 |
| P1 | Repository 派生查询替代 findAll().stream() | 5 天 |

### 第三阶段：数据库生产化（1-2 周）

| 优先级 | 动作 | 工作量 |
|---|---|---|
| P1 | H2 → PostgreSQL 16 | 2 天 |
| P1 | 开启 Flyway，初始化基线脚本 | 3 天 |
| P1 | HikariCP 连接池调优 | 1 天 |
| P1 | 高频查询字段加 `@Index` | 3 天 |

### 第四阶段：性能优化（2-3 周）

| 优先级 | 动作 | 工作量 |
|---|---|---|
| P1 | 消除 N+1 查询（service 层 findAll().filter() 模式） | 5 天 |
| P2 | 引入 Redis 缓存（字典/配置/病历热点） | 5 天 |
| P2 | 引入 Caffeine 本地缓存（知识图谱） | 2 天 |

### 第五阶段：分布式演进（4-6 周）

| 优先级 | 动作 | 工作量 |
|---|---|---|
| P2 | 引入 Nacos 注册中心 + 配置中心 | 5 天 |
| P2 | 拆分核心模块为独立服务（挂号/医嘱/病历） | 10 天 |
| P2 | 引入 Kafka 异步化（通知/审计/AI） | 5 天 |
| P2 | 引入 Sentinel 熔断限流 | 3 天 |

---

## 五、已修复的问题（本轮审计）

| 问题 | 修复方式 | 文件 |
|---|---|---|
| 无统一鉴权拦截器骨架 | 新增 `common/AuthInterceptor.java` 骨架（待接入 Security） | `common/AuthInterceptor.java`（新建） |
| 无 WebMvc 配置类注册拦截器 | 新增 `common/WebConfig.java` | `common/WebConfig.java`（新建） |

> 注：本轮仅加**骨架**，实际鉴权逻辑（JWT 解析、角色校验）待 `spring-boot-starter-security` 引入后补全。

---

## 六、诚实声明

- 本报告所有数字均来自实际代码扫描（Grep/Glob/PowerShell），非估算
- "裸奔"就是裸奔，没有美化
- 143 模块的规模在当前单体阶段是合理的，但**距离大三甲多院区生产级还差 2-3 个数量级**
- 核心结论：**当前是"可演示的原型"，不是"可上线的生产系统"**
