# 健澜AI原生医院操作系统OS — 部署文档

## 三层架构图

```
┌──────────────────────────────────────────────────────────────┐
│  体验层    React 19 + TypeScript + Bun BFF (8080)           │
│           医生/护士工作站 UI、AI 对话流式                     │
├──────────────────────────────────────────────────────────────┤
│  核心交易层 Java 21 + Spring Boot 3.5 + Modulith (9090)       │
│           挂号/收费/医嘱/床位/EMR/质控/医保 28 模块           │
├──────────────────────────────────────────────────────────────┤
│  智能层    Python 3.11 + FastAPI + vLLM (8000)             │
│           NLP质控/CDSS/影像AI/预后预测/相似病例 13 router      │
├──────────────────────────────────────────────────────────────┤
│  数据层    PostgreSQL 16 (5432) + Redis 7 (6379)            │
└──────────────────────────────────────────────────────────────┘
```

## 本地开发启动步骤

```bash
# 一键启动全栈（docker-compose）
make up

# 跑 Java 测试
make test-java

# 跑 Python 测试
make test-python

# 查看日志
make logs

# 停止
make down
```

## 生产部署建议

### 方案一：docker-compose + systemd（中小医院）

```bash
# 构建镜像
docker compose build

# 启动服务
docker compose up -d

# 设置 systemd 开机自启
systemctl enable docker-compose@jlmedaios
```

### 方案二：k3s 轻量 K8s（三甲医院）

```bash
# 安装 k3s
curl -sfL https://get.k3s.io | sh -

# 部署
kubectl apply -f deploy/k3s/
```

## 环境变量清单

| 变量 | 默认值 | 说明 |
|---|---|---|
| `LOCAL_VLLM_URL` | `http://vllm:8000/v1` | 本地 vLLM 推理地址 |
| `DB_URL` | `jdbc:postgresql://postgres:5432/monolith` | PostgreSQL 连接串 |
| `REDIS_URL` | `redis://redis:6379/0` | Redis 连接串 |
| `API_KEY` | - | AI 服务 API Key（Bearer Token） |
| `SPRING_PROFILES_ACTIVE` | `dev` | 运行环境（dev/prod） |
| `JAVA_OPTS` | `-Xms2g -Xmx4g` | JVM 参数 |
| `PYTHONPATH` | `/app` | Python 路径 |

## 端口表

| 服务 | 端口 | 说明 |
|---|---|---|
| monolith (Java) | 9090 | 核心交易层 |
| ai-service (Python) | 8000 | 智能层 |
| web-bff (TS) | 8080 | BFF 聚合层 |
| PostgreSQL | 5432 | 数据库 |
| Redis | 6379 | 缓存 |
| H2 Console | 9090/h2-console | 开发调试用 |
| Prometheus | 9090/actuator/prometheus | 指标监控 |

## 健康检查端点

| 端点 | 服务 | 说明 |
|---|---|---|
| `http://localhost:9090/actuator/health` | Java | Spring Boot Actuator |
| `http://localhost:8000/health` | Python | FastAPI 健康检查 |
| `http://localhost:9090/actuator/info` | Java | 应用信息 |
| `http://localhost:9090/actuator/prometheus` | Java | Prometheus 指标 |

## 生产切换提示

1. **数据库**：H2（开发）→ PostgreSQL 16（生产）→ 达梦信创（远期）
2. **AI 推理**：mock（开发）→ vLLM GPU 节点（生产）
3. **密钥**：本地 mock（开发）→ HSM 加密机（生产）
4. **审计**：本地 JSON（开发）→ ELK/Loki（生产）
