# jlmedaios Java 旁路/参考实现（Spring Cloud 微服务骨架 + 独立模块化单体）

> 健澜科技 jlmedaios — HIS 核心交易层 Java 旁路/参考骨架。注册中心用 Eureka Server、网关用 Spring Cloud Gateway（代码库当前未使用 Nacos、Sentinel、Seata），业务模块默认 H2 内存数据库，零外部依赖即可跑通。
>
> **角色边界**：本目录为旁路/参考实现，不进入主线默认 compose 编排（`legacy` profile 显式启动）；主线为 Bun + TypeScript BFF（`src/bff/`）+ React 工作台（`web/`）。本机未安装 Maven，聚合工程与单体均**未能在本机独立构建**，需在具备 JDK 17/21 + Maven 3.9+ 的环境执行 `mvn clean install -DskipTests`。
>
> 实测规模（2026-10 本机命令统计）：聚合工程 14 个模块、`pom.xml` 15 个、`.java` 文件 75 个；独立单体 `jlmedaios-monolith` 1 个 `pom.xml`、`.java` 文件 767 个（main 650 + test 117）；两部分合计 `.java` 842 个、`pom.xml` 16 个。聚合父 POM Spring Boot 3.3.5 + Spring Cloud 2024.0.0 + JDK 17；`jlmedaios-monolith` 为独立 parent（Spring Boot 3.5.3 + JDK 21），不纳入本聚合。

## 前置要求

- JDK 17（聚合工程各微服务）；独立单体 `jlmedaios-monolith` 需 JDK 21
- Maven 3.9+

## 模块结构

```
services-java/
├── pom.xml                      # 父 POM（Spring Boot 3.3.5 + Spring Cloud 2024.0.0，JDK 17）
├── jlmedaios-registry/          # 注册中心（Eureka Server，端口 8761）
├── jlmedaios-gateway/          # API 网关（Spring Cloud Gateway，端口 9000）
├── jlmedaios-his-reg/           # 挂号微服务（端口 9101）
├── jlmedaios-his-charge/        # 收费微服务（端口 9102）
├── jlmedaios-his-orders/        # 医嘱微服务（端口 9103）
├── jlmedaios-his-pharmacy/      # 药房微服务（端口 9104）
├── jlmedaios-his-empi/          # 患者主索引 EMPI（端口 9105）
├── jlmedaios-his-ward/          # 住院床位微服务（端口 9106）
├── jlmedaios-his-lis/           # 检验对接微服务（端口 9107，预留 HL7/FHIR）
├── jlmedaios-his-nursing/       # 护理微服务（端口 9108）
├── jlmedaios-his-exam/           # 检查对接微服务（端口 9109）
├── jlmedaios-his-discharge/     # 出院结算微服务（端口 9110）
├── jlmedaios-his-report/        # 运营报表微服务（端口 9111，只读查询，无 H2 库）
├── jlmedaios-his-message/       # 院内消息微服务（端口 9112）
└── jlmedaios-monolith/          # 独立模块化单体（Boot 3.5.3 / JDK 21，端口 9090，独立 parent，不进聚合）
```

## 端口表

| 模块 | 端口 | H2 库 | 说明 |
|---|---|---|---|
| jlmedaios-registry | 8761 | - | Eureka 注册中心（单机模式） |
| jlmedaios-gateway | 9000 | - | API 网关（统一入口） |
| jlmedaios-his-reg | 9101 | hisreg | 挂号微服务 |
| jlmedaios-his-charge | 9102 | hischarge | 收费微服务 |
| jlmedaios-his-orders | 9103 | hisorders | 医嘱微服务 |
| jlmedaios-his-pharmacy | 9104 | hispharmacy | 药房微服务 |
| jlmedaios-his-empi | 9105 | hisempi | 患者主索引（EMPI） |
| jlmedaios-his-ward | 9106 | hisward | 住院床位微服务 |
| jlmedaios-his-lis | 9107 | hislis | 检验对接微服务（预留 HL7 v2.x / FHIR R4） |
| jlmedaios-his-nursing | 9108 | hisnursing | 护理记录微服务 |
| jlmedaios-his-exam | 9109 | hisexam | 检查申请/结果微服务 |
| jlmedaios-his-discharge | 9110 | hisdischarge | 出院申请/结算/小结微服务 |
| jlmedaios-his-report | 9111 | - | 运营报表只读查询微服务 |
| jlmedaios-his-message | 9112 | hismessage | 院内消息收发微服务 |
| jlmedaios-monolith | 9090 | H2 内存库 | 独立模块化单体（JDK 21，独立 parent；compose 宿主映射 127.0.0.1:19090） |

## 启动顺序

1. **registry**（8761）— 先启动注册中心
2. **his-reg / his-charge / his-orders / his-pharmacy / his-empi / his-ward / his-lis / his-nursing / his-exam / his-discharge / his-report / his-message**（9101–9112）— 各业务微服务
3. **gateway**（9000）— 最后启动网关

## Build

```bash
cd services-java
mvn clean install -DskipTests
```

## Run

每个模块单独启动：

```bash
# 方式一：Maven 插件
cd jlmedaios-registry && mvn spring-boot:run
cd jlmedaios-his-reg && mvn spring-boot:run
cd jlmedaios-his-charge && mvn spring-boot:run
cd jlmedaios-his-orders && mvn spring-boot:run
cd jlmedaios-his-pharmacy && mvn spring-boot:run
cd jlmedaios-his-empi && mvn spring-boot:run
cd jlmedaios-his-ward && mvn spring-boot:run
cd jlmedaios-his-lis && mvn spring-boot:run
cd jlmedaios-his-nursing && mvn spring-boot:run
cd jlmedaios-his-exam && mvn spring-boot:run
cd jlmedaios-his-discharge && mvn spring-boot:run
cd jlmedaios-his-report && mvn spring-boot:run
cd jlmedaios-his-message && mvn spring-boot:run
cd jlmedaios-gateway && mvn spring-boot:run
```

## 接口清单

### his-reg（挂号，9101）
- `POST /api/his/register` — 创建挂号
- `GET  /api/his/register/{id}` — 查询挂号

### his-charge（收费，9102）
- `POST /api/his/charge` — 创建收费
- `GET  /api/his/charge/by-register/{registerId}` — 按挂号 ID 查收费列表

### his-orders（医嘱，9103）
- `POST /api/his/orders` — 开立医嘱
- `GET  /api/his/orders/patient/{patientId}` — 按患者查医嘱
- `PUT  /api/his/orders/{id}/execute` — 执行医嘱（status → EXECUTED）
- `PUT  /api/his/orders/{id}/cancel` — 取消医嘱（status → CANCELLED）

### his-pharmacy（药房，9104）
- `GET  /api/his/pharmacy/drugs` — 全部药品
- `POST /api/his/pharmacy/dispense` — 发药核对（body: orderId/drugCode/operator）
- `GET  /api/his/pharmacy/stock` — 库存列表

### his-empi（患者主索引，9105）
- `POST /api/his/empi/register` — 患者建档（body: name/gender/idCard/phone）
- `GET  /api/his/empi/{empiId}` — 按 EMPI ID 查患者
- `GET  /api/his/empi/search?idCard=xxx` — 按身份证查患者

### his-ward（住院床位，9106）
- `GET  /api/his/ward/beds` — 全部床位
- `POST /api/his/ward/admit` — 入住（body: bedCode/patientId）
- `POST /api/his/ward/discharge` — 出院（body: bedCode）

### his-lis（检验对接，9107）
- `POST /api/his/lis/request` — 申请检验（body: patientId/testCode/testName）
- `GET  /api/his/lis/result/{requestId}` — 查询检验结果
- TODO: 对接 LIS 系统 HL7 v2.x / FHIR R4 接口

### his-nursing（护理，9108）
- `POST /api/his/nursing/orders` — 提交护理记录/医嘱执行记录
- `GET  /api/his/nursing/orders/patient/{patientId}` — 按患者查护理记录

### his-exam（检查对接，9109）
- `POST /api/his/exam/request` — 申请检查
- `GET  /api/his/exam/result/{requestId}` — 查询检查结果
- `GET  /api/his/exam/schedule` — 检查排班查询

### his-discharge（出院，9110）
- `POST /api/his/discharge/apply` — 出院申请
- `POST /api/his/discharge/settle` — 出院结算
- `GET  /api/his/discharge/summary/{visitId}` — 出院小结查询

### his-report（运营报表，9111，只读）
- `GET /api/his/report/outpatient/daily` — 门诊日报表
- `GET /api/his/report/inpatient/occupancy` — 住院床位占用
- `GET /api/his/report/pharmacy/sales` — 药房销售汇总

### his-message（院内消息，9112）
- `POST /api/his/message/send` — 发送院内消息
- `GET  /api/his/message/inbox/{receiverId}` — 收件箱查询

## H2 Console

所有业务微服务均开启 H2 Console：`http://localhost:{port}/h2-console`，用户 `sa`，密码空。

| 模块 | 端口 | JDBC URL |
|---|---|---|
| his-reg | 9101 | `jdbc:h2:mem:hisreg` |
| his-charge | 9102 | `jdbc:h2:mem:hischarge` |
| his-orders | 9103 | `jdbc:h2:mem:hisorders` |
| his-pharmacy | 9104 | `jdbc:h2:mem:hispharmacy` |
| his-empi | 9105 | `jdbc:h2:mem:hisempi` |
| his-ward | 9106 | `jdbc:h2:mem:hisward` |
| his-lis | 9107 | `jdbc:h2:mem:hislis` |
| his-nursing | 9108 | `jdbc:h2:mem:hisnursing` |
| his-exam | 9109 | `jdbc:h2:mem:hisexam` |
| his-discharge | 9110 | `jdbc:h2:mem:hisdischarge` |
| his-report | 9111 | 无 H2 库（只读报表查询） |
| his-message | 9112 | `jdbc:h2:mem:hismessage` |

## 鉴权说明

网关统一鉴权过滤器 `AuthFilter`：所有经过网关的请求必须带请求头 `X-Auth-Token`，否则返回 401：

```json
{"code":401,"message":"缺少 X-Auth-Token 请求头","data":null}
```

## 测试 curl 示例

### 1. 患者建档（经网关 9000）

```bash
curl -X POST http://localhost:9000/api/his/empi/register \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: test-token" \
  -d '{"name":"张三","gender":"男","idCard":"330100199001011234","phone":"13800000000"}'
```

### 2. 开立医嘱

```bash
curl -X POST http://localhost:9000/api/his/orders \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: test-token" \
  -d '{
    "patientId": 1,
    "orderType": "MEDICATION",
    "content": "阿莫西林胶囊 0.5g tid",
    "doctorName": "李医生"
  }'
```

### 3. 执行医嘱

```bash
curl -X PUT http://localhost:9000/api/his/orders/1/execute \
  -H "X-Auth-Token: test-token"
```

### 4. 床位入住

```bash
curl -X POST http://localhost:9000/api/his/ward/admit \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: test-token" \
  -d '{"bedCode":"A01-1","patientId":1}'
```

### 5. 申请检验

```bash
curl -X POST http://localhost:9000/api/his/lis/request \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: test-token" \
  -d '{
    "patientId": 1,
    "testCode": "CBC",
    "testName": "血常规"
  }'
```

### 6. 不带 token（应返回 401）

```bash
curl http://localhost:9000/api/his/orders
# → {"code":401,"message":"缺少 X-Auth-Token 请求头","data":null}
```

## 健康检查

```bash
curl http://localhost:9000/actuator/health
curl http://localhost:9101/actuator/health
curl http://localhost:9102/actuator/health
curl http://localhost:9103/actuator/health
curl http://localhost:9104/actuator/health
curl http://localhost:9105/actuator/health
curl http://localhost:9106/actuator/health
curl http://localhost:9107/actuator/health
curl http://localhost:9108/actuator/health
curl http://localhost:9109/actuator/health
curl http://localhost:9110/actuator/health
curl http://localhost:9111/actuator/health
curl http://localhost:9112/actuator/health
```

> 独立单体 `jlmedaios-monolith`（端口 9090，compose 宿主映射 `127.0.0.1:19090`）的启动方式、H2 Console 与健康检查见其目录下 [README.md](./jlmedaios-monolith/README.md)。
