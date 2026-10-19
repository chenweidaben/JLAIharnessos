# jlmedaios Java 核心交易层（Spring Cloud 微服务骨架）

> 健澜科技 jlmedaios - HIS 核心交易层 Java 微服务骨架。替代 Nacos（用 Eureka Server）+ APISIX（用 Spring Cloud Gateway），H2 内存数据库，零外部依赖即可跑通。

## 前置要求

- JDK 17
- Maven 3.9+

## 模块结构

```
services-java/
├── pom.xml                      # 父 POM（Spring Boot 3.3.5 + Spring Cloud 2024.0.0）
├── jlmedaios-registry/          # 注册中心（Eureka Server，端口 8761）
├── jlmedaios-gateway/          # API 网关（Spring Cloud Gateway，端口 9000）
├── jlmedaios-his-reg/           # 挂号微服务（端口 9101）
└── jlmedaios-his-charge/        # 收费微服务（端口 9102）
```

## 端口表

| 模块 | 端口 | 说明 |
|---|---|---|
| jlmedaios-registry | 8761 | Eureka 注册中心（单机模式） |
| jlmedaios-gateway | 9000 | API 网关（统一入口） |
| jlmedaios-his-reg | 9101 | 挂号微服务 |
| jlmedaios-his-charge | 9102 | 收费微服务 |

## 启动顺序

1. **registry**（8761）— 先启动注册中心
2. **his-reg**（9101）— 挂号微服务
3. **his-charge**（9102）— 收费微服务
4. **gateway**（9000）— 最后启动网关

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
cd jlmedaios-gateway && mvn spring-boot:run

# 方式二：打包后 java -jar
java -jar jlmedaios-registry/target/jlmedaios-registry-1.0.0-SNAPSHOT.jar
java -jar jlmedaios-his-reg/target/jlmedaios-his-reg-1.0.0-SNAPSHOT.jar
java -jar jlmedaios-his-charge/target/jlmedaios-his-charge-1.0.0-SNAPSHOT.jar
java -jar jlmedaios-gateway/target/jlmedaios-gateway-1.0.0-SNAPSHOT.jar
```

## H2 Console

- his-reg：http://localhost:9101/h2-console （JDBC URL: `jdbc:h2:mem:hisreg`，用户 `sa`，密码空）
- his-charge：http://localhost:9102/h2-console （JDBC URL: `jdbc:h2:mem:hischarge`，用户 `sa`，密码空）

## 鉴权说明

网关统一鉴权过滤器 `AuthFilter`：所有经过网关的请求必须带请求头 `X-Auth-Token`，否则返回 401：

```json
{"code":401,"message":"缺少 X-Auth-Token 请求头","data":null}
```

## 测试 curl 示例

### 1. 创建挂号记录（经网关 9000）

```bash
curl -X POST http://localhost:9000/api/his/register \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: test-token" \
  -d '{
    "patientName": "张三",
    "deptCode": "INTERNAL",
    "doctorName": "李医生",
    "appointmentDate": "2026-10-20"
  }'
```

### 2. 查询挂号记录

```bash
curl http://localhost:9000/api/his/register/1 \
  -H "X-Auth-Token: test-token"
```

### 3. 创建收费记录

```bash
curl -X POST http://localhost:9000/api/his/charge \
  -H "Content-Type: application/json" \
  -H "X-Auth-Token: test-token" \
  -d '{
    "registerId": 1,
    "itemName": "门诊诊查费",
    "amount": 50.00
  }'
```

### 4. 按挂号 ID 查询收费列表

```bash
curl http://localhost:9000/api/his/charge/by-register/1 \
  -H "X-Auth-Token: test-token"
```

### 5. 不带 token（应返回 401）

```bash
curl http://localhost:9000/api/his/register/1
# → {"code":401,"message":"缺少 X-Auth-Token 请求头","data":null}
```

## 直接访问微服务（绕过网关，调试用）

```bash
# 直接调 his-reg（9101，无需 token）
curl -X POST http://localhost:9101/api/his/register \
  -H "Content-Type: application/json" \
  -d '{"patientName":"李四","deptCode":"SURGERY","doctorName":"王医生","appointmentDate":"2026-10-21"}'

curl http://localhost:9101/api/his/register/1
```

## 健康检查

```bash
curl http://localhost:9000/actuator/health
curl http://localhost:9101/actuator/health
curl http://localhost:9102/actuator/health
```
