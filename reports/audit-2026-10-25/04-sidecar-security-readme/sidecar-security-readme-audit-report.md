# A4 编排 / 旁路构建性 / 安全 / README 审计整改报告（2026-10-25，Windows 本机实测）

> 仓库根：`C:\Users\lenovo\Doubao\chats\2026-09-14\new-chat-1`
> 主线 = Bun TS BFF（`src/bff/`，8080）+ React 工作台（`web/`）；Java 多模块、Python FastAPI、radar-inference、miniprogram 为旁路/参考，本轮不删除、不合并。
> 边界：仅修改 `docker-compose.yml`、`docker-compose.prod.yml`、`deploy/**`、`.env.example`、`.env.compose.example`、`services-java/**`、`services-python/**`、`services/**`、`miniprogram/**`、`README.md`、`README_EN.md`；`src/**`、`web/src/**`、`web/package.json`、`tests/**`、根 `package.json`、`docs/**/*.md` 只读未改。

---

## ① 实测计数表（命令 + 原始输出摘要 + 文件数 / 条数）

### 1.1 本机工具链原始输出（2026-10-25 复跑）

| 命令 | 原始输出摘要 | 判定 |
|---|---|---|
| `node -v` | `v22.23.2` | 在位 |
| `npm -v` | `10.9.8` | 在位 |
| `python --version` | `Python 3.13.16` | 在位（系统解释器，site-packages 只读） |
| `java -version` | `openjdk version "17.0.19" 2026-04-21 LTS`（Microsoft-13877129 build 17.0.19+10-LTS） | 在位 **JDK 17**；**无 JDK 21** |
| `mvn -v` | 命令无法识别（`mvn` NOT AVAILABLE） | **Maven 缺失**，Java 无法构建 |
| `docker --version` / `docker compose version` | 命令无法识别（`docker` NOT AVAILABLE） | **Docker CLI 缺失**，compose 无法在本机执行 |
| `C:\Users\lenovo\.bun\bin\bun.exe --version` | `1.2.0`；根 `engines.bun ≥1.3.0`，`packageManager bun@1.4.2` | 版本低于下限，`bun audit` 子命令不存在 |
| `C:\Users\lenovo\.bun\bin\bun.exe audit` | `error: Script not found "audit"`，exit 1 | bun 1.2.0 无 audit 子命令；已回退 `npm audit --omit=dev`（见 §④） |
| `pip-audit --version` | 未安装 | Python 依赖未做漏洞扫描 |

### 1.2 Java（`services-java/**`）

| 口径 | 实测值 | 取证命令 / 位置 |
|---|---|---|
| 聚合工程 `pom.xml` 声明 `<module>` | **14** | `services-java/pom.xml:22-35`（registry、gateway、his-reg、his-charge、his-orders、his-pharmacy、his-empi、his-ward、his-lis、his-exam、his-nursing、his-discharge、his-report、his-message） |
| 全量 `pom.xml` 文件 | **16**（聚合 15 + 独立单体 1） | `Get-ChildItem -Recurse -Filter pom.xml` |
| 全量 `.java` 文件 | **842** | 聚合 75 + 独立单体 767（main 650 + test 117） |
| 聚合父 POM Spring Boot | **3.3.5** | `services-java/pom.xml:10` |
| Spring Cloud | **2024.0.0** | `services-java/pom.xml:45` |
| 聚合 JDK | **17** | `services-java/pom.xml:41`（`java.version=17`） |
| 独立单体 Boot | **3.5.3** | `services-java/jlmedaios-monolith/pom.xml:10` |
| 独立单体 JDK | **21** | `services-java/jlmedaios-monolith/pom.xml:26` |
| 单体 `*Controller.java` | **142** | `Get-ChildItem -Recurse -Filter *Controller.java` |
| 单体一级包目录 `com.jlmedaios.monolith.*` | **143**（含 `common/config/security/openapi` 等基础设施包） | 目录遍历实测 |

### 1.3 Python — services-python（`services-python/**`）

| 口径 | 实测值 | 说明 |
|---|---|---|
| `.py` 文件合计 | **94**（源码 92 + 测试 2） | `app/**/*.py` 92；`tests/` 2（`test_health.py`、`__init__.py`） |
| `APIRouter()` 声明 | **84** | 源码内 `APIRouter(` 出现次数 |
| 路由装饰器 | **103**（GET **16** / POST **87**；PUT 0 / DELETE 0 / PATCH 0 / WS 0） | `@router.get(`、`@router.post(` 计数 |
| `main.py` `include_router` 挂载 | **83** | `services-python/app/main.py`；存在 **1 个已声明未挂载** Router（旁路清理待办） |
| `requirements.txt` 依赖 | fastapi≥0.115.0、uvicorn[standard]≥0.30.0、pydantic≥2.0、sqlalchemy≥2.0、asyncpg≥0.29、redis≥5.0、prometheus-client≥0.20、pytest≥8.0、httpx≥0.27 | `services-python/requirements.txt` |

### 1.4 Python — radar-inference（`services/radar-inference/**`）

| 口径 | 实测值 | 说明 |
|---|---|---|
| 自研 `.py` | **18**（app 10 + tests 8）；vendor 89（`vendor/damo-radar/**`，第三方参考代码，不计入自研规模） | 目录遍历实测 |
| 端点 | **5**（GET **4** / POST **1**） | `app/main.py:58 /health/live`、`:63 /health/ready`、`:80 /api/v1/radar/catalog`、`:107 /api/v1/radar/jobs/{job_id}`；`:92 POST /api/v1/radar/jobs` |
| `requirements.txt`（demo/CPU） | fastapi≥0.110、uvicorn[standard]≥0.29、pydantic≥2.6、pandas≥2.0、numpy≥1.26、python-multipart≥0.0.9、httpx≥0.27、pytest≥8.0 | `services/radar-inference/requirements.txt` |
| `requirements-prod.txt`（GPU 可选） | torch≥2.1（cu121 index）、monai≥1.3、SimpleITK≥2.3、nibabel≥5.1、huggingface_hub≥0.23、transformers≥4.40、tqdm≥4.66 | `services/radar-inference/requirements-prod.txt` |

### 1.5 前端路由（`web/src/router/index.tsx`，只读解析）

| 口径 | 实测值 | 说明 |
|---|---|---|
| `<Route path=` 挂载 | **3052** 处 | 正则 `<Route\s+path="([^"]*)"`（2026-10-25 快照；`web/src` 并发迭代中，数字随路由增删漂移） |
| 去重路径 | **2847** 条 | 重复挂载清理属 `web/src` 边界，本轮未动 |
| BFF REST 路由数 | **不在本轮实测范围**，由 BFF 侧代理实测；README 标注「见 BFF 实测」，不写死 | — |

### 1.6 数据库迁移（`deploy/postgres/init/**`）

| 口径 | 实测值 |
|---|---|
| SQL 脚本数 | **354** |
| 编号区间 | **01 – 385**（min=1，max=385） |
| 唯一序号 | **349**；缺号 **36**（3–9、11–14、16–19、31–34、43–49、235、240、372–379） |
| 重复编号 | **5** 个序号各 2 份：90、209、228、229、230 |
| 总行数 | **29,862** 行（2026-10-25 复跑；`deploy/postgres/init/**` 处于并发增量，行数随迁移脚本增删漂移；README 仅披露脚本数 354，不写死行数） |

---

## ② 旁路可构建性矩阵

### 2.1 服务级核查（构建文件 / context / 工具链 / 端口 / 结论）

| 服务 | 角色 | 构建文件存在性 | `build.context` 实测 | 本机工具链状态 | 宿主端口绑定 | 结论 / 阻塞 |
|---|---|---|---|---|---|---|
| `app`（BFF 主线） | 主线 | `Dockerfile.backend` ✓（多阶段；runtime `oven/bun:1.4.2-slim`，非 root 用户 `bunapp` uid=10001，内建 fetch 探针） | `.` ✓ | node v22.23.2 / npm 10.9.8 在位；**bun 1.2.0 低于 engines ≥1.3.0**；无 Docker CLI，镜像未能本机构建 | `127.0.0.1:${APP_PORT:-8080}:8080`（`docker-compose.yml:93-94`） | 源码级 `bun run bff:watch` 可起（建议先升级 Bun ≥1.3）；**镜像构建本机阻塞：无 Docker** |
| `web`（前端主线） | 主线 | `web/Dockerfile.frontend` ✓（node:22-alpine 构建 → nginx:1.28-alpine 运行，非 root uid=101，busybox wget `/healthz`） | `web` ✓ | node/npm 在位，`web/node_modules` 在位；无 Docker | 仅 `expose: 8080`（`docker-compose.yml:120-121`），无宿主端口；Vite 开发 5173 | 本机 `bun run dev` 可起；**镜像构建本机阻塞：无 Docker** |
| `radar-inference` | 旁路 `demo`/`gpu` profile | `services/radar-inference/Dockerfile` ✓（demo 阶段 python:3.11-slim + `requirements.txt`；GPU prod 阶段整段注释） | `services/radar-inference` ✓ | 系统 Python 3.13 无 fastapi；**但仓库内 `services/radar-inference/.venv`（Python 3.14.5）已装 fastapi/uvicorn/pydantic/pandas/numpy/httpx**，import 冒烟通过（5 条路由可枚举）；prod torch/monai/权重缺失；无 Docker | `expose: 8090`（`docker-compose.yml:174-175`），**不发布宿主端口** | demo 级 import 冒烟通过；**镜像构建阻塞：无 Docker**；prod 推理阻塞：GPU 依赖 + 5GB 非商业权重（CC BY-NC-SA 4.0）未下载 |
| `jlmedaios-ai`（services-python 旁路） | 旁路 `legacy` profile | `services-python/Dockerfile` ✓（python:3.11-slim 单阶段，requirements → COPY .） | `./services-python` ✓ | 系统 Python 3.13 缺 fastapi/uvicorn/pydantic/sqlalchemy/asyncpg/redis/prometheus-client/httpx；无本目录 venv；无 Docker | `127.0.0.1:8000:8000`（`docker-compose.yml:673-674`） | **本机未能独立构建/启动**：依赖未安装 + 无 Docker |
| `jlmedaios-monolith`（Java 单体旁路） | 旁路 `legacy` profile | `services-java/jlmedaios-monolith/Dockerfile` ✓（**单阶段** `COPY target/*.jar`，基础镜像 eclipse-temurin:21-jre） | `./services-java/jlmedaios-monolith` ✓ | **无 Maven**；系统为 JDK 17、单体需 JDK 21；无 Docker | `127.0.0.1:19090:9090`（`docker-compose.yml:638-640`） | **本机未能独立构建/启动**：无 Maven、无 JDK 21、无 Docker；Dockerfile 必须先在宿主机 `mvn -DskipTests package` 出 jar，无多阶段 Maven 构建（P1 待办） |
| Java 聚合微服务（14 模块） | 旁路参考 | `services-java/pom.xml` + 14 个子模块 `pom.xml` ✓ | 仅独立样例 `services-java/jlmedaios-monolith/docker-compose.yml`；根 compose 不编排聚合工程 | 无 Maven；JDK 17 在位、JDK 21 缺 | registry 8761、gateway 9000、9101–9112（本机直连口径，非 compose 宿主映射） | **本机未能构建**：无 Maven；各业务模块 H2 内存库、`password:` 留空（非硬编码口令），H2 console 开发态开启；actuator 仅暴露 `health,info`（gateway 另含 `gateway` 端点） |
| `miniprogram` | 旁路参考 | **无 `package.json`**，原生微信小程序（8 页面，`app.json` 注册清单与 README 一致；AppID `touristappid` 占位） | 不参与 compose 编排 | 需微信开发者工具，本机未安装 | — | **本机未能构建**：需 DevTools；线上接入须替换真实 AppID、完成备案与隐私协议配置 |
| postgres / redis / kafka / elasticsearch / kibana / prometheus / grafana / alertmanager / postgres-exporter / redis-exporter / jaeger | 基础设施 | 官方镜像或 `deploy/observability/Dockerfile.jaeger` ✓ | jaeger context `deploy/observability` ✓（`Dockerfile.jaeger`）；其余无 build 段 | 无 Docker CLI | 除 nginx 外全部回环绑定（见 §3.2） | **本机未能拉起**：无 Docker |

### 2.2 独立样例 compose 核查（旁路自编排，`--profile standalone`）

| 文件 | 服务 | 构建文件 / context | 宿主端口 | 工具链 | 结论 |
|---|---|---|---|---|---|
| `services-java/jlmedaios-monolith/docker-compose.yml` | monolith + postgres + redis（3 服务） | monolith Dockerfile ✓；postgres/redis 官方镜像 | monolith `127.0.0.1:19090:9090`；postgres `127.0.0.1:5432:5432`；redis `127.0.0.1:6379:6379` | 无 Maven / JDK 21 / Docker | 编排文件 YAML 解析通过；**本机未能执行**。注意：5432/6379 与根 compose 默认值同号，两份样例**互斥、不可同机并行** |
| `services-python/docker-compose.yml` | ai-service + vllm-openai（2 服务） | ai-service `services-python/Dockerfile` ✓；vllm 官方镜像 | ai `127.0.0.1:8000:8000`；vllm `127.0.0.1:8001:8000` | 依赖未安装；无 Docker | YAML 解析通过；`AI_API_KEYS` 必填（`:?`），**本机未能执行** |

### 2.3 构建上下文 / Dockerfile 存在性实测（`Test-Path` 全 True）

`app`（context `.`，`Dockerfile.backend`）、`web`（context `web`，`web/Dockerfile.frontend`）、`radar-inference`（`services/radar-inference`，`Dockerfile`）、`nginx`（`deploy/nginx`，`Dockerfile`）、`jaeger`（`deploy/observability`，`Dockerfile.jaeger`）、`jlmedaios-monolith`（`services-java/jlmedaios-monolith`，`Dockerfile`）、`jlmedaios-ai`（`services-python`，`Dockerfile`）——7 处 build 段引用的 context 与 Dockerfile 全部真实存在，**未发现引用不存在上下文的配置**。

---

## ③ Compose 审计发现与已落地整改

### 3.1 服务清单（YAML 解析实测）

- 基础档 `docker-compose.yml`：**17** 个服务（app、web、radar-inference、postgres、redis、kafka、nginx、prometheus、grafana、alertmanager、postgres-exporter、redis-exporter、elasticsearch、kibana、jaeger、jlmedaios-monolith、jlmedaios-ai）。
- 生产覆盖 `docker-compose.prod.yml`：**15** 个服务覆盖项（app、web、radar-inference、postgres、redis、kafka、nginx、prometheus、grafana、alertmanager、postgres-exporter、redis-exporter、elasticsearch、kibana、jaeger）；**不含** monolith、ai（legacy profile 默认不进生产）。
- profile 分组：`jlmedaios-monolith`、`jlmedaios-ai` = `legacy`；`radar-inference` = `demo`、`gpu`；两份独立样例 = `standalone`。主线默认编排不拉起任何旁路。

### 3.2 网络隔离矩阵（`docker-compose.yml`）

| 网络 | 成员服务 |
|---|---|
| `frontend` only | web |
| `backend` only | app、radar-inference、postgres、redis、kafka、jlmedaios-monolith、jlmedaios-ai |
| `frontend` + `backend` | nginx |
| `backend` + `monitoring` | prometheus、postgres-exporter、redis-exporter、jaeger |
| `monitoring` only | grafana、alertmanager、elasticsearch、kibana |

**结论：postgres / redis / kafka / elasticsearch 均未接入 `frontend` 网络，网关不可直达数据层 ✓**。三层网络声明见 `docker-compose.yml:716-725`；头部拓扑注释 `:20-24`。

### 3.3 宿主端口与冲突整改

| 服务 | 绑定地址 | 宿主端口 → 容器端口 | 证据 |
|---|---|---|---|
| app | `127.0.0.1` | `${APP_PORT:-8080}` → 8080 | `:93-94` |
| postgres | `127.0.0.1` | `${POSTGRES_PORT:-5432}` → 5432 | `:225-226` |
| redis | `127.0.0.1` | `${REDIS_PORT:-6379}` → 6379 | `:258-259` |
| kafka | `127.0.0.1` | `${KAFKA_PORT:-9092}` → 9092 | `:300-301` |
| nginx | `0.0.0.0`（唯一公网入口） | `${HTTP_PORT:-80}` → 8080；`${HTTPS_PORT:-443}` → 8443 | `:332-334` |
| prometheus | `127.0.0.1` | `${PROMETHEUS_PORT:-9090}` → 9090 | `:367-368` |
| grafana | `127.0.0.1` | `${GRAFANA_PORT:-3000}` → 3000 | `:404-405` |
| alertmanager | `127.0.0.1` | `${ALERTMANAGER_PORT:-9093}` → 9093 | `:432-433` |
| postgres-exporter | `127.0.0.1` | `${PG_EXPORTER_PORT:-9187}` → 9187 | `:463-464` |
| redis-exporter | `127.0.0.1` | `${REDIS_EXPORTER_PORT:-9121}` → 9121 | `:493-494` |
| elasticsearch | `127.0.0.1` | `${ES_PORT:-9200}` → 9200 | `:535-536` |
| kibana | `127.0.0.1` | `${KIBANA_PORT:-5601}` → 5601 | `:569-570` |
| jaeger | `127.0.0.1` | `${JAEGER_PORT:-16686}` → 16686 | `:609-611` |
| jlmedaios-monolith | `127.0.0.1` | **19090** → 9090 | `:638-640` |
| jlmedaios-ai | `127.0.0.1` | 8000 → 8000 | `:673-674` |

**冲突整改（本轮已落地）**：原 monolith 宿主 9090 与 prometheus 回环 9090 同号，同机并行冲突；已将 monolith 改为 `127.0.0.1:19090:9090`（`docker-compose.yml:638-640`）。复扫宿主端口集合：8080、5432、6379、9092、80、443、9090、3000、9093、9187、9121、9200、5601、16686、19090、8000，**无重复**。除 nginx 外全部回环绑定 ✓。

### 3.4 `depends_on` 条件与健康检查

| 服务 | `depends_on`（条件） | healthcheck 命令（证据） | 状态 |
|---|---|---|---|
| app | postgres / redis / kafka = `service_healthy`（`:75-81`） | `bun scripts/docker/healthcheck.ts ready`（`:86-91`；脚本 `scripts/docker/healthcheck.ts` 实测存在） | ✓ |
| web | app = `service_started`（`:114-116`） | `wget -q -O /dev/null http://127.0.0.1:8080/healthz`（`:122-127`） | ✓ |
| radar-inference | 无依赖 | `python -c urllib.request.urlopen('http://127.0.0.1:8090/health/live')`（`:184-189`） | ✓ |
| postgres | 无依赖 | `pg_isready -U "$${POSTGRES_USER}" -d "$${POSTGRES_DB}"`（`:227-233`） | ✓ |
| redis | 无依赖 | `redis-cli -a "$${REDIS_PASSWORD}" ... ping \| grep -q PONG`（`:260-265`） | ✓ |
| kafka | 无依赖 | `kafka-topics.sh --bootstrap-server 127.0.0.1:9092 --list`（`:302-308`） | ✓ |
| nginx | app / web = `service_healthy`（`:323-327`） | `wget ... http://127.0.0.1:8080/healthz`（`:335-340`） | ✓ |
| prometheus | 无依赖 | `wget ... http://127.0.0.1:9090/-/healthy`（`:369-374`） | ✓ |
| grafana | prometheus = `service_started`（`:398-400`） | `wget ... http://127.0.0.1:3000/api/health`（`:406-411`） | ✓ |
| alertmanager | 无依赖 | `wget ... http://127.0.0.1:9093/-/healthy`（`:434-439`） | ✓ |
| postgres-exporter | postgres = `service_healthy`（`:459-461`） | `wget ... http://127.0.0.1:9187/metrics`（`:465-470`） | ✓ |
| redis-exporter | redis = `service_healthy`（`:489-491`） | `wget ... http://127.0.0.1:9121/metrics`（`:495-500`） | ✓ |
| elasticsearch | 无依赖 | `curl -fsS -u "elastic:$${ELASTIC_PASSWORD}" .../_cluster/health?local=true`（`:537-542`） | ✓ |
| kibana | elasticsearch = `service_healthy`（`:563-565`） | `curl -fsS http://127.0.0.1:5601/api/status`（`:571-577`） | ✓ |
| jaeger | 无依赖 | `/bin/busybox wget ... http://127.0.0.1:16686/`（`:612-617`） | ✓ |
| jlmedaios-ai | 无依赖 | `python -c urllib.request.urlopen('http://127.0.0.1:8000/health')`（`:681-686`） | ✓ |
| jlmedaios-monolith | postgres / redis = `service_healthy`（`:641-645`） | **缺失**（`:657-658` 注释说明：temurin:21-jre 镜像未内置 wget/curl；探针待镜像补工具后落地，当前以依赖 healthy 为前置） | ⚠ 已记录待办（P2） |

> 说明：overlay 不重复声明 healthcheck/networks/ports，生产覆盖文件中 `hc=False` 表现为合并继承，不是缺陷。

### 3.5 密钥占位审计（基础档，缺失即拒绝启动 `${VAR:?}`；可选 `${VAR:-}`）

| 变量 | 位置 | 占位形式 |
|---|---|---|
| `POSTGRES_USER` / `POSTGRES_PASSWORD` / `POSTGRES_DB` | app `:60`；postgres `:205-207`；pg-exporter `:455`；monolith `:649-651` | `${VAR:?...}` 必填 |
| `REDIS_PASSWORD` | app `:62`；redis `:250`；redis-exporter `:485` | `${VAR:?...}` 必填 |
| `JWT_SECRET` | app `:66` | `${VAR:?}` 必填 |
| `ENCRYPTION_MASTER_KEY` | app `:67` | `${VAR:?}` 必填 |
| `RADAR_INTERNAL_TOKEN` | app `:74`（`${:-}` 可选）；radar-inference `:158`（`${:?}` 必填） | 旁路侧必填 |
| `GRAFANA_ADMIN_PASSWORD` | grafana `:389` | `${VAR:?}` 必填；`GRAFANA_ADMIN_USER` 默认 admin `:388` |
| `ES_PASSWORD`（compose 内变量名 `ELASTIC_PASSWORD` 注入容器） | elasticsearch `:519`；kibana `:559` | `${ES_PASSWORD:?}` 必填；`healthcheck:538` 内 `$$ELASTIC_PASSWORD` 为容器内 `$$` 转义插值，**非 compose 变量缺失**（脚本曾误报，已核对澄清） |
| `SPRING_DATASOURCE_PASSWORD` | monolith `:651` | `${:?}` 必填（本轮由硬编码 `changeit` 改造） |
| `JLMEDAIOS_SECURITY_JWT_SECRET` | monolith `:654` | `${:?}` 必填（本轮新增） |
| `AI_API_KEYS` | jlmedaios-ai `:678` | `${:-}` 可选（遗留 mock 缺口，见 §④ P2） |
| `LOCAL_VLLM_URL` | jlmedaios-ai `:679` | `${:-http://vllm:8000/v1}` 可选 |
| `TLS_CERT_DIR` | `docker-compose.prod.yml:230` | `${:?}` 生产必填，防止误用自签开发证书；`.env.compose.example:140` 提供路径占位 `/etc/jlmedaios/certs`（开发留空即回退自签证书） |

### 3.6 生产覆盖档审计（`docker-compose.prod.yml`）

- **无源码 bind mount**：全档仅 nginx 只读证书绑定（`:226-234`）+ 命名卷 `certbot-www`（`:236`）；不存在挂载 `src/`、`web/` 源码目录的开发态卷。
- **无 debug 端口、无测试卷**：未声明 JAVA_DEBUG / NODE_INSPECT / 5858 等调试映射；无测试数据卷。
- 加固项：`no-new-privileges:true`、`cap_drop: [ALL]`（app `:50-53`、web `:91-94`、nginx `:219-222`、prometheus `:264-267`、grafana `:292-295`、alertmanager `:320-323`、两个 exporter `:348-351` / `:368-371`）；stateless 服务 `read_only: true` + tmpfs（web `:95-97`、nginx `:223-225`、prometheus `:268-270`、grafana `:296-298`、alertmanager `:324-326`、exporters `:352-354` / `:372-374`）。
- 资源限额：15 个服务均给出 cpus / memory reservations + limits（`:39-49`、`:80-90`、`:113-123`、`:137-147`、`:161-171`、`:184-194`、`:208-218`、`:253-263`、`:281-291`、`:309-319`、`:337-347`、`:357-367`、`:380-392`、`:405-415`、`:428-441`）。
- 头部注释 `:7-10` 明确：**生产禁止追加 `--profile legacy`**；radar 仅在确需影像辅诊时显式启用对应 profile。

### 3.7 本轮已落地 Compose / 配置整改清单

1. `docker-compose.yml:619` 原 `SPRING_DATASOURCE_PASSWORD: changeit`（基线 §7 硬编码）→ `:651` 改为 `${SPRING_DATASOURCE_PASSWORD:?...}`，并在两份 `.env*` 示例补齐占位说明。
2. monolith 宿主端口 9090 → **19090**，消除与 prometheus 9090 的回环冲突（`:638-640`）。
3. monolith 新增 `JLMEDAIOS_SECURITY_JWT_SECRET: ${:?}` 必填占位（`:654`）。
4. `services-java/jlmedaios-monolith/docker-compose.yml` 整文件重写：`profiles: [standalone]`；monolith/postgres/redis 全部 `127.0.0.1` 回环；内部独立网络 `jlmedaios-monolith-backend`；必填 `SPRING_DATASOURCE_PASSWORD`、`JLMEDAIOS_SECURITY_JWT_SECRET`、`POSTGRES_PASSWORD`、`REDIS_PASSWORD`；redis `--requirepass`；postgres/redis 健康检查；删除 `changeit`；monolith 探针待镜像补工具（注释留存）。YAML 解析通过（3 服务）。
5. `services-python/docker-compose.yml` 整文件重写：`profiles: [standalone]`；`127.0.0.1:8000:8000`、`127.0.0.1:8001:8000`；内部网络 `jlmedaios-python-backend`；`AI_API_KEYS: ${:?}` 必填；vllm `service_started` 条件。YAML 解析通过（2 服务）。
6. `services-java/jlmedaios-monolith/src/main/resources/application.yml`：
   - `:9` 数据源 URL 参数化 `${SPRING_DATASOURCE_URL:jdbc:postgresql://localhost:5432/jlmedaios}`；`:11` 用户名参数化；`:12` 口令 `${SPRING_DATASOURCE_PASSWORD:}`；`:54` 注释 5433 → 5432；
   - `:87` 硬编码 dev secret → `${JLMEDAIOS_SECURITY_JWT_SECRET:}`，注释标注生产必填；
   - 残留 `:76` actuator `include: health,info,prometheus,metrics,env`（`env` 端点列入 §④ P1 待办，未在本轮删除——Java 侧无法本机 Maven 回归）。
7. `services-java/.../common/JwtAuthenticationFilter.java:45-54`：去除 `@Value` 内联开发默认值；密钥空白即抛 `IllegalStateException("JWT secret 未配置：请设置环境变量 JLMEDAIOS_SECURITY_JWT_SECRET")`（fail-closed）。
8. `services-java/pom.xml:21-38`：`<modules>` 对齐为实测 14 个模块；注释说明 monolith 独立 parent 不进聚合。
9. `.env.example`、`.env.compose.example`：补齐 `SPRING_DATASOURCE_PASSWORD`、`JLMEDAIOS_SECURITY_JWT_SECRET`、`REDIS_URL` / `KAFKA_BROKERS` / `ES_URL`、`AI_API_KEYS`、`LOCAL_VLLM_URL`、监控与 ES 端口/口令、`TLS_CERT_DIR` 等占位、默认值与说明；示例值全部为 `CHANGE_ME_*` / 路径占位，**无真实口令**。全量 37 个 compose 插值变量对账无缺漏：`ELASTIC_PASSWORD` 为健康检查 `$$` 容器内转义、非 compose 变量（compose 侧对应 `ES_PASSWORD` 已在 `.env.compose.example:128` 声明）；`VAR` 仅出现在 `docker-compose.yml:37` 注释示例文本，非真实插值。
10. deploy 品牌与命名收口（`deploy/**` 范围内）：compose `name: jlmedaios`（`:41`）；镜像 `registry.jianlan.tech/jlmedaios/*`；`OTEL_SERVICE_NAME=jlmedaios-bff`（`:70`）；ES `cluster.name=jlmedaios-logs`（`:514`）；kibana `SERVER_NAME=jlmedaios-kibana`（`:556`）；卷/网络 `jlmedaios-*`；grafana provider / folderUid `jlmedaios`；旧 `gangos-infra.json` / `gangos-overview.json` / `gangos.yml` 删除，新建 `jlmedaios-infra.json`、`jlmedaios-overview.json`、`deploy/prometheus/rules/jlmedaios.yml`（告警名 `Jlmedaios*`；`gangos_*` 指标表达式因与 `src` BFF 上报耦合，本轮保留，列入待办随 src 重构统一改名）；alertmanager 发件人 `jlmedaios-alert@`；`deploy/postgres/backup.sh`、`restore.sh` 默认容器 `jlmedaios-postgres`、库 `jlmedaios`；nginx / jaeger Dockerfile LABEL 改 `jlmedaios-*`。

### 3.8 服务依赖拓扑与启动顺序（写入 compose 头部注释与 README）

1. **基础设施先起**：postgres、redis、kafka（无内部依赖，各自健康检查通过后放行下游）；elasticsearch、kibana、prometheus、grafana、alertmanager、jaeger、两个 exporter 属 monitoring 域，随编排并行拉起。
2. **app**：等待 postgres / redis / kafka 全部 `service_healthy` 后启动；`/ready` 探针再校验依赖连通性。
3. **web**：等待 `app` `service_started` 后启动（前端为静态产物，不直连数据库）。
4. **nginx**：等待 `app`、`web` 均 `service_healthy` 后绑定 80/443，是唯一对外入口。
5. 旁路默认不启动；`--profile legacy` 时 monolith 等待 postgres / redis healthy；`--profile demo|gpu` 时 radar 独立启动；`jlmedaios-ai` 无内部 depends_on。
6. 独立样例（`services-python/docker-compose.yml`、`services-java/jlmedaios-monolith/docker-compose.yml`）为 standalone profile，与根 compose 互斥，不可同机并行。

---

## ④ 安全合规审计（STRIDE；证据 file:line；src 为只读取证，归属另一代理，本轮未修改）

### 4.1 现状取证（保守假设：未文档化的控制不视为存在）

**JWT 签发与主动吊销**
- 签发：`src/bff/middleware/auth.ts:71-84` HS256；iss `jianlan-bff`（`:79`，旧品牌展示串，src 边界待办）；密钥 `getJwtSecret()` `:50-60`——生产缺失即抛错（`:56`），开发回退公开默认值 `dev-only-insecure-jwt-secret-change-me`（`:59`）。
- 验签：`verifyJwt` `:87-119`，`timingSafeEqual`（`:103`），nbf/exp 校验 `:116-117`；jti `newJti` `:57`；演示令牌 `jt-/jr-` 仅非生产接受（`:162-169`）。
- 主动吊销：会话台账 `src/db/repositories/sessionRepo.ts` `getActiveByJti:83`、`revokeByJti:116`、`revokeByRefreshJti:130`、`revokeForUser:144`；调用点 `aggregators/adminUserAggregator.ts:156/187/215`、`aggregators/loginLogAggregator.ts:42`；进程内吊销即时缓存 `sessionGuard.ts:33-35`。

**RBAC 权限校验落点**
- `requireAuth` `auth.ts:175-185`；`requireRole` `:188-201`；`requireRoleGuard` `:207-216`；`requirePermissionCode` `:318-330`（admin 直通 `:322`、权限码精确匹配 `:323`、报表分组通配 `:325`）。各守卫在路由上的实际调用点清单属 `src` 侧路由盘点，本轮不汇总静态子串计数（`src` 并发迭代中，子串命中数易漂移、不等同守卫调用次数）；上述函数定义与分支位置为本轮实测证据。

**审计日志落库**
- 操作审计：`src/bff/middleware/audit.ts:35` 建 `audit.operation_log`；`:61` `maskBody` 先脱敏；`:71` INSERT；`:85` DEMO_MODE 跳过；写库失败仅告警不阻断主请求（`:88-90`）。
- 数据访问日志：`src/bff/routes/adminAuditLog.ts:64` 读 `medmuse.data_access_log`。
- 哈希链审计：`src/db/repositories/auditChainRepo.ts:4`（注释：BEFORE INSERT 触发器维护 seq/prev_hash/hash）、`:51` INSERT、`:76` / `:108` 咨询锁；`src/security/audit/LogIntegrity.ts:25` GENESIS_HASH 64 个 0、`:52` computeLogHash、`:53` sha256、`:56` prevHash、`:68` sealLogEntry；`src/db/repositories/auditLogRepo.ts:107/124/143` 只读 `audit.audit_logs`。

**患者数据最小化（接口字段 / 日志 / 脱敏）**
- 主线脱敏：`src/bff/utils/mask.ts` `maskName:25`、`maskIdCard:45`、`maskPhone:66`、`maskBody:103`（按字段名匹配 name/idCard/phone 等递归脱敏 `:116-122`）；`src/bff/adapters/desensitize.ts:10/17/23/35/37-40`；IM 消息体 AES 落库 `src/bff/aggregators/imAggregator.ts:135`。
- 旁路脱敏：`services-python/app/core/sensitive.py:12` `mask_phi`（身份证 `:33`、手机 `:36`、姓名 `:39`）；`services/radar-inference/app/logging_redact.py:42` RedactionFilter、`:57` safe_ref、`:90` sanitize_error_message（不回传 traceback）。

**传输加密 / 存储加密现状**
- 边缘 TLS：仅 nginx 8443（`deploy/nginx/nginx.conf:164-165`；`snippets/ssl-common.conf:12-13` 证书路径、`:16` TLS1.2/1.3、`:20` 强套件、`:35-36` OCSP stapling）；prod `TLS_CERT_DIR` 必填（`docker-compose.prod.yml:230`）。
- **内部组件明文（单主机内网现状）**：PG exporter `sslmode=disable`（`docker-compose.yml:455`）；Redis 无 TLS（`:248`）；Kafka `PLAINTEXT`（`:284-288`、`:294`）；ES `xpack.security.transport.ssl.enabled=false`（`:517`）、`http.ssl.enabled=false`（`:518`）；Kibana `http://elasticsearch:9200`（`:557`）。
- 存储加密：`src/security/encryption/EncryptionService.ts:11` AES-256-GCM 注释、`:49` keyDir `./.keys`、`:65` LocalFileKeyManager、`:82` `createCipheriv('aes-256-gcm',...)`、`:112` decipher；`.keys/master.key` 32 字节，`.gitignore:25 .keys/`；`src/config/ConfigManager.ts:94` `enableDesensitization`、`:95` `encryptionMasterKey`、`:96` `jwtSecret`；`ENCRYPTION_MASTER_KEY` 由环境变量注入（compose `:67`）。

**密钥管理现状**
- 主线 JWT/字段主密钥/DB/Redis/ES/Grafana 口令均走 compose `${:?}` 注入（§3.5）；本地字段加密主密钥落 `.keys/master.key`（gitignore）；K8s `deploy/k8s/02-secret.yaml:23-27` 为 `change-me-*` 占位，头部 `:4-8` 注明上线必须替换并推荐 External Secrets / Sealed Secrets / Vault。
- 旁路：`services-python/app/core/api_key_auth.py:26-37` 内置 mock key `ak_mock_client_001/002`；`:39` 读 `AI_API_KEYS`；`:51-52` 未配时回退 mock；`:55` 进程内内存限流；`audit_middleware.py:20` `AUDIT_FILE=./data/audit.json`、`:44-45/:50-51` 读写本地 JSON（未落库、未接 ELK）。
- 测试夹具（非生产硬编码）：`services/radar-inference/tests/conftest.py:17` `TEST_TOKEN="test-secret-token"`、`tests/test_redaction.py:23` `PatientSecret-9f3a`，仅测试用途。

### 4.2 依赖漏洞实测（audit 真实摘要）

**环境说明**：根目录 `bun audit` 不可用（bun 1.2.0 无 audit 子命令，`error: Script not found "audit"`，exit 1）；根脚本 `security:audit = bun audit || npm audit --omit=dev` 已自动回退 `npm audit --omit=dev`。本机默认 registry 为 npmmirror（不实现 audit 接口），故显式指定官方 registry `https://registry.npmjs.org` 复测。完整原文存 `scratch/audit-root.txt`、`scratch/audit-web.txt`。

**根目录（`npm audit --omit=dev --registry=https://registry.npmjs.org`）：11 vulnerabilities（4 moderate / 6 high / 1 critical）**

| 包 | 等级 | 版本区间 | 要点 / Advisory | 修复方式 |
|---|---|---|---|---|
| proxy-addr | **critical** | 1.1.0–2.0.7 | IPv4-mapped IPv6 trust subnet 伪造 IP（GHSA-jqcg-44mw-7w3h） | `npm audit fix`（非破坏） |
| @modelcontextprotocol/sdk | high | ≤1.31.0 | OAuth 凭证跨服务发送、实验任务未绑定会话、跨域重定向重放 header/body、内存耗尽、bearer token 跨服务接受（GHSA-6qxp-vccf-f47h / 6prh-2h8m-c8cw / 46jr-4wx8-v453 / rvq5-wwqv-78pq 等 5 条） | `--force` 升 1.32.2（超出声明范围） |
| axios | high | 1.0.0–1.19.0 | 原型污染、ReDoS、SSRF、代理绕过、header 注入、socket 劫持等 12 条（GHSA-vh66-26gq-q6x8、c29m-xwm3-cm6r、mghh-pgcx-3jjj、44g4-m2mj-wpvx、r4gj-5m52-g5wh 等） | `--force` 升 1.20.0（超出声明范围） |
| body-parser | high | 2.0.0–2.3.0 | 压缩尾随字节 DoS（GHSA-27r3-jxmh-p828） | `npm audit fix` |
| follow-redirects | high | 1.16.0 | 数组头绕过跨域凭证剥离、sensitiveHeaders 正则转义泄露（GHSA-q3jh-wrc6-jgq8、8r9p-f939-6h3c） | `npm audit fix` |
| undici | high | 7.0.0–7.30.0 | WebSocket 解压 DoS、响应拆分、跨用户 cookie 泄露、TLS 校验绕过、SRI 绕过等 14 条（GHSA-3wwx-pv8p-q78v、r53p-7pc4-xj5r、2jfj-6hjv-fm6j、w293-vg96-wgc3、f72v-6w45-q472 等） | `--force` 升 7.30.1（超出声明范围） |
| zod | high | <4.6.6 | 超大约束集合校验内存耗尽（GHSA-mrhx-c7xc-m3w5） | `--force` 升 4.6.7（超出声明范围） |
| @anthropic-ai/sdk | moderate | 0.79.0–0.91.0 | Memory 工具路径校验沙箱逃逸、本地文件权限不安全（GHSA-5474-4w2j-mq4c、p7fg-763f-g4gf） | `--force` 升 1.3.0（breaking） |
| fast-uri | moderate | 3.0.0–3.1.8 | host 大小写归一化、scheme 伪造、路径等价混淆、host 混淆等 5 条（GHSA-hrr3-gc8f-f4qj、w74x-v6f9-j3xg 等） | `npm audit fix` |
| hono | moderate | 4.12.4–4.13.10 | `serveStatic` 二次解码绕过中间件（GHSA-5r4p-p66f-jhc7） | `npm audit fix` |
| ip-address | moderate | ≤10.7.3 | 跨族子网比较放行、长串二次复杂度 DoS（GHSA-j6r3-76f7-8jcv、h3mg-xc3c-68pw、rxp7-6hxx-x8q5） | `npm audit fix` |

**`web/` 目录（同命令）：4 vulnerabilities（3 moderate / 1 high）**

| 包 | 等级 | 版本区间 | 要点 / Advisory | 修复方式 |
|---|---|---|---|---|
| follow-redirects | high | 1.16.0 | 同根仓两条（GHSA-q3jh-wrc6-jgq8、8r9p-f939-6h3c） | `npm audit fix` |
| echarts | moderate | <6.1.0 | 跨站脚本 XSS（GHSA-fgmj-fm8m-jvvx） | `--force` 升 6.1.0（breaking） |
| react-router | moderate | 6.0.0–7.17.0 | 反斜杠开放重定向（GHSA-wrjc-x8rr-h8h6）、`deserializeErrors()` 构造器注入（GHSA-337j-9hxr-rhxg）；`react-router-dom` 为传递依赖 | `--force` 升 7.18.4（breaking） |

**未扫描项（如实标注，未伪造结果）**
- Java / Maven 依赖：本机无 `mvn`，**未做 OWASP dependency-check 扫描**。
- Python 依赖：系统解释器未装 fastapi 等、`pip-audit` 未安装；services-python 与 radar 依赖**未做漏洞扫描**。
- 本轮不强行升级任何依赖：升级受 antd 5 / React 19 兼容、双锁文件（`bun.lock` + `package-lock.json`）口径约束，须先跑通 `tsc --noEmit` 与 `bun test` / `vitest run` 回归全绿，再分批升级（列入 P1 待办）。

### 4.3 分级清单（P0 阻断上线 / P1 上线前修复 / P2 尽快修复；证据 file:line；不新建业务端点、不臆造控制措施）

#### P0（阻断上线）

| # | 证据 | 威胁 / 风险 | 处置建议 | 归属提示 |
|---|---|---|---|---|
| P0-1 | `src/bff/middleware/auth.ts:177-179`：`DEMO_MODE === '1'` 时 `c.user = { id:'demo', roles:['admin'], permissions:['*'] }` 并 `return null`；该短路**未叠加 `NODE_ENV=production` 硬拒绝**；配套 `sessionGuard.ts:72-73` DEMO_MODE 跳过 jti 查库、`audit.ts:85` DEMO_MODE 跳过审计落库 | 若生产环境误置 `DEMO_MODE=1`，任意请求直接获得 admin 全权限，且无会话校验、无审计留痕（Elevation of Privilege / Repudiation） | 启动期硬闸门：`NODE_ENV=production && DEMO_MODE=1` 时进程直接退出；`requireAuth` / `enforceSession` / `auditOperation` 三处统一读取同一生产判定；补充演示模式在生产被拒绝的集成测试 | src 边界（BFF 代理） |
| P0-2 | `proxy-addr` 1.1.0–2.0.7 critical（GHSA-jqcg-44mw-7w3h），根仓 `node_modules/proxy-addr`；IPv4-mapped IPv6 可伪造信任子网内客户端 IP，影响日志/限流/审计中的 IP 归因（Spoofing / Information Disclosure） | 回归全绿后先执行 `npm audit fix`（非破坏项）；核查 `x-forwarded-for` 信任网段配置；补一条代理头伪造用例 | src / 根包边界（BFF 代理 + 收口） |

#### P1（上线前修复）

| # | 证据 | 威胁 / 风险 | 处置建议 | 归属提示 |
|---|---|---|---|---|
| P1-1 | `src/bff/middleware/sessionGuard.ts:42-56`：`isSessionActive` DB 查询 `catch` 后 `return true`（fail-open，`:52-55`）；`:11` 注释已说明容错意图 | 数据库抖动/故障期间，已吊销令牌在缓存窗口内仍可通过会话校验（Elevation of Privilege） | 关键鉴权路由改 fail-closed；或采用受限缓存 TTL + 熔断告警，断库超过阈值即拒绝；补断库场景单测 | src 边界 |
| P1-2 | 内部明文：PG exporter `:455` `sslmode=disable`；Redis 无 TLS `:248`；Kafka `PLAINTEXT` `:284-294`；ES transport/http SSL false `:517-518`；Kibana http `:557` | 单主机内网尚可接受；**多节点 / 跨网段生产部署前**组件间 PHI 与凭证明文传输（Information Disclosure / Tampering） | 生产拓扑启用 PG SSL、Redis TLS、Kafka SASL_SSL、ES TLS；compose 增加 `internal-tls` profile 或在 K8s 部署文档中写明前置条件 | 部署侧 + BFF 代理 |
| P1-3 | 单体 `services-java/jlmedaios-monolith/src/main/resources/application.yml:76` actuator `include: health,info,prometheus,metrics,env`；`common/SecurityConfig.java:59` `anyRequest().permitAll()`，`env` / `metrics` 不匹配 `/api/**` 而落入放行分支 | 未鉴权可达 `actuator/env`，泄露环境变量（含潜在口令线索）与运行配置（Information Disclosure） | 暴露面收敛为 `health,info,prometheus`；`anyRequest()` 改 `authenticated()`；actuator 路径纳入白名单外鉴权；需 Maven 回归（本机缺 Maven，列入待办） | services-java 边界（旁路，独立上线前必改） |
| P1-4 | `deploy/k8s/02-secret.yaml:23-27` `change-me-*` 占位（头部 `:4-8` 已警示） | 若部署方遗忘替换即上线，密钥可被仓库读者获知（Spoofing / Tampering） | 上线门禁校验 Secret 非占位值；推荐 External Secrets / Sealed Secrets / Vault；移除 Git 内任何 stringData 占位 | 部署收口 |
| P1-5 | 根 6 条 high + web 1 条 high（axios、@mcp/sdk、body-parser、follow-redirects、undici、zod；web follow-redirects）与 7 条 moderate 升级 | 原型污染、SSRF、ReDoS、内存耗尽、凭证泄露等暴露面（Tampering / DoS / Information Disclosure） | 分批升级：先 `npm audit fix` 非破坏项；breaking 项（axios 1.20、mcp 1.32、undici 7.30、zod 4.6.7、web echarts 6 / react-router 7.18.4）在 antd 5 / React 19 兼容验证、双锁文件一致、`tsc --noEmit` + `bun test` + `vitest run` 全绿后执行；记录变更与回归证据 | src / web 边界 + 收口 |
| P1-6 | 本机 Bun 1.2.0 低于根 `engines.bun ≥1.3.0`、`packageManager bun@1.4.2`；`bun audit` 子命令缺失 | 运行时与声明版本不一致，脚本/API 行为偏差；依赖审计无法走原生链路 | 开发/CI 统一升级 Bun ≥1.4.2；CI 接入 `bun audit`（版本满足后）或保留 npm audit 兜底 | 收口 / CI |
| P1-7 | Java 依赖（本机无 Maven）与 Python 依赖（pip-audit 未装、依赖未进系统环境）本轮**未扫描** | 旁路第三方组件漏洞面未知 | CI 接入 OWASP dependency-check（Maven）与 pip-audit（services-python、radar），纳入镜像构建前置门禁 | 收口 / CI |
| P1-8 | `services-java/jlmedaios-monolith/Dockerfile` 单阶段 `COPY target/*.jar`，依赖宿主机先 `mvn package` | 镜像不可独立构建，CI/迁移易漏前置步骤（Availability / 可重复构建） | 改多阶段：Maven 构建阶段 → temurin:21-jre 运行阶段；补镜像内 wget/curl 后落地 actuator 健康检查 | services-java 边界 |

#### P2（尽快修复，非阻断）

| # | 证据 | 问题 | 处置建议 |
|---|---|---|---|
| P2-1 | `services-python/app/core/api_key_auth.py:26-37/:39/:51-52/:55`；`audit_middleware.py:20/:44-45/:50-51` | 未配 `AI_API_KEYS` 回退 mock key；进程内内存限流（多实例失效）；审计写本地 `./data/audit.json`，未落库、未接 ELK，180 天留存未落地；鉴权与审计仅覆盖 `/ai/*` 前缀（`api_key_auth.py:122`、`audit_middleware.py:64`） | 旁路对外前：强制 `AI_API_KEYS` 非空启动（独立样例 compose 已 `:?`）；限流接 Redis；审计接 PostgreSQL / ELK；梳理非 `/ai/*` 端点是否需鉴权 |
| P2-2 | `services-python/app/main.py` 83 个 `include_router` vs 84 个 `APIRouter()` 声明 | 1 个已声明 Router 未挂载（死路由，接口契约/统计不一致） | 清理挂载或在 README 标注保留意图 |
| P2-3 | 聚合各 `his-*` 模块 H2 console 开发态开启、`SecurityConfig.java:65` frameOptions 关闭；单体 H2 console 已在 `application.yml:31` 关闭 | 若旁路被独立部署到非开发环境，H2 console 与 frame 策略构成攻击面 | 任何 standalone 发布前关闭 H2 console、恢复 frameOptions；按环境 profile 区分 |
| P2-4 | `miniprogram/` AppID `touristappid` 占位；隐私协议、用户授权弹窗、内容安全审核链路未配置 | 上线合规缺口（Information Disclosure / Repudiation） | 替换真实 AppID；补齐小程序隐私协议与备案；PHI 不落端上本地存储 |
| P2-5 | `src/bff/middleware/auth.ts:79` iss `jianlan-bff`（旧品牌展示串）；`src/bff/middleware/audit.ts:2` 头注释旧称；根 `Dockerfile.backend:44/90`、`web/Dockerfile.frontend:35/83` 旧 LABEL | 品牌残留（src / Dockerfile 归属其他代理，本轮未触碰） | 随 src 与镜像收口批次统一替换为 `jlmedaios` / 正式名 |
| P2-6 | Grafana 看板 / Prometheus 规则内 `gangos_*` 指标表达式（`deploy/grafana/dashboards/jlmedaios-*.json`、`deploy/prometheus/rules/jlmedaios.yml`） | 指标前缀与 `src` BFF 上报耦合，本轮改名会断采集；命名待统一 | 随 src 遥测重构一次性改名 `jlmedaios_*`，同步看板与规则 |
| P2-7 | `services-python/app/core/config.py:10` `LOCAL_VLLM_URL` 默认 `http://vllm:8000/v1`；单体 `common/AiClientConfig.java:22` 硬编码 `http://127.0.0.1:8000/v1` 常量（`:28-31` 为境外厂商域名黑名单） | 旁路参考实现硬编码本地端点；Java 侧未走环境变量 | Java 侧端点改配置注入；保持禁止境外大模型黑名单现状 |
| P2-8 | `deploy/observability/alertmanager/alertmanager.yml:39-49` receivers 默认空、SMTP 整段注释（`:17-22`，密码注明 secret 注入） | 开箱无外发通知渠道 | 生产上线前按值班体系接入短信/电话/企业 IM/Webhook；SMTP 密码走 Secret |
| P2-9 | 单体 `application.yml:76` actuator `metrics/prometheus` 未鉴权（配合 P1-3）；CSRF 在 `SecurityConfig.java:38` 关闭（无状态 JWT，设计可接受） | 旁路 standalone 暴露面 | 随 P1-3 一并收敛；CSRF 决策在文档中留痕 |
| P2-10 | 前端存在重复挂载（3052 挂载 vs 2847 路径，205 处重复，2026-10-25 快照） | 路由表冗余，可能造成匹配顺序歧义 | 归属 `web/src`，收口时去重到单一权威 Route |

### 4.4 显式核查排除项（非缺陷，不列入问题清单）

- **`adminSurgeryOptimizeRoutes` 已挂载**：`src/bff/server.ts:4602` `...adminSurgeryOptimizeRoutes,`（M130-D：`POST /api/v1/admin/surgery/schedule/optimize`；导入在 `:660`），**不属于漏挂**，本轮与后续评审均不得记为缺陷。
- `services/radar-inference/tests/conftest.py:17`、`test_redaction.py:23` 为测试夹具密钥，非生产硬编码。
- 单体 `OpenApiService.java:38/:59` 的 `sk_` 密钥为运行时 `UUID.randomUUID()` 随机生成，非硬编码口令。

---

## ⑤ README 改动章节清单（口径与品牌实测对齐；英文与中文一致）

### 5.1 `README.md`（根目录）

| 章节 / 行段 | 改动内容 |
|---|---|
| 顶部标题与徽章（`:1-19`） | 标题改为「健澜AI原生医院操作系统OS」；徽章运行时/前端/数据库口径对齐实测；声明主线 = Bun BFF（`src/`，8080）+ React（`web/`），四个旁路角色与默认编排边界写入引言 |
| 「架构分层与实测清单」表（`:23-33`） | 替换旧虚报口径（130 模块 / 70 router / 1957 路由 / 620+ 端点 / 173+ / 200+ / 500+）为 §① 实测值：前端 3052 挂载 / 2847 路径（2026-10-25 快照）；Java 14 模块 / 15 pom / 75 java + 单体 1 pom / 767 java，合计 842 java / 16 pom；Python 92+2、84 router、103 装饰器、83 挂载；radar 18 自研 py、5 端点；小程序 8 页；SQL 354 脚本 01–385；BFF 路由数标注「见 BFF 实测」不写死 |
| 快速启动代码块（`:35-44`） | clone 地址补 GitHub 镜像注释；`cp .env.compose.example .env` 说明；健康检查 URL `/ready`、`/health`、`/metrics`；注明默认编排不拉起 legacy/demo/gpu 旁路；数据库端口 5432（旧 5433 全部更正） |
| 里程碑表（`:124-131`、`:141-148`） | 路由数改为「见 BFF 实测」；迁移数 354、编号 01–385；历史自报口径（176/288 切片、97.92%/99.5% 覆盖率、P95 72ms、68 aggregator）本轮未独立复测，保留为 BFF 自报叙事（见 §⑥ 声明） |
| 架构图与技术栈表（`:158-188`） | 端口 5432 更正；运行时 Bun ≥1.3；去除 Nacos/Sentinel/Seata 不实表述（实际 Eureka Server + Spring Cloud Gateway，`:548/:556`） |
| 快速启动指南（`:192-216`） | 环境要求如实写明本机 node v22.23.2、Bun 1.2.0 低于 engines 下限、无 Maven/Docker；Java/Python/radar 旁路无法本机独立构建；BFF 命令纠正为 `bun run bff:watch`（旧 `bun run dev` 实为 CLI 入口 `src/entrypoints/cli.tsx`）；`bun run db:seed`；前端 `cd web && bun install && bun run dev`（5173） |
| 主线健康检查表（`:218-225`） | 补齐 `/health`、`/ready`、`/metrics`、`/api/v1/system/health` 四个探测端点与方法 |
| 关键环境变量表（`:227-238`） | 对齐 `.env.example`：`DATABASE_URL`、`HTTP_PORT`、`DEMO_MODE`、`JWT_SECRET`、`ENCRYPTION_MASTER_KEY`、`REDIS_URL/KAFKA_BROKERS/ES_URL`、LLM 三件套、Radar 地址与 token |
| 容器化部署段（`:242-250`） | `docker compose up -d` 主线默认；旁路 profile 示例；编排变量指向 `.env.compose.example` |
| 目录结构（`:256-296`） | 补 `miniprogram/`、`services-java/`、`services-python/`、`services/radar-inference/` 旁路目录与角色注释；`src/db/` 注释更正为数据访问层（repositories / 连接池） |
| 生产就绪状态表（`:424-431`） | 前端 tsc 标注 2026-10 基线 exit 0；单测用例数不写死（以 `bun test` 实测为准）；迁移 354 脚本；PG 5432 |
| 末尾「分层现状与演进方向」（`:538-576`） | 主线/旁路角色与技术栈表对齐实测；Java 侧注明 Eureka + Spring Cloud Gateway，未引入 Nacos/Sentinel/Seata；合规目标保留等保三级、电子病历六级、互联互通四甲 |

### 5.2 `README_EN.md`（口径与中文一致）

| 章节 | 改动内容 |
|---|---|
| 标题与品牌（`:3-7`） | `jlmedaios · Jianlan AI-Native Hospital OS`；并列正式中文名；代码名 `jlmedaios` |
| Architecture & Measured Inventory（`:88-102`） | 与中文表同口径：3052/2847 前端路由（2026-10-25 快照）、Java 14/15/75 + 1/767 = 842/16、Python 92+2/84/103/83、radar 18/5、小程序 8 页、SQL 354；旁路独立构建前提逐条写明；补注 radar 本地 venv 仅 import 冒烟级、镜像因无 Docker 未构建 |
| Quick Start（`:106-121`） | 环境要求如实写 node v22.23.2、Bun 1.2.0 低于下限、无 Maven/Docker；`git clone` GitCode + GitHub mirror；`cp .env.example .env`；`bun run bff:watch`；前端 5173；`cd jlmedaios-os` 目录名订正 |
| Health probes（`:123-130`） | 与中文表一致四端点 |
| Key environment variables（`:132-143`） | 与 `.env.example` 对齐 |
| Container deployment（`:145-153`） | 主线默认、legacy/demo/gpu 旁路 profile 显式启动；`.env.compose.example` 指引 |
| 其余章节 | 保留定位、能力矩阵、功能全景、开放协作、安全红线、许可证等历史章节；仅替换品牌展示串与失实数字 |

### 5.3 旁路 README（新增 / 改写）

| 文件 | 改动 |
|---|---|
| `services-java/README.md` | 角色边界注记；实测 14 模块 / 15 pom / 75 java + 单体 1 pom / 767 java；模块树与端口表（8761 registry、9000 gateway、9101–9112、单体宿主 19090）；启动顺序；H2 库清单；健康检查命令；本机无 Maven 未能构建声明 |
| `services-java/jlmedaios-monolith/README.md` | 767 = main 650 + test 117；143 个一级包目录（含基础设施包）；142 个 Controller；单阶段 Dockerfile 前置说明；探针待办；H2 Console 与健康检查路径 |
| `services-python/README.md` | 92+2、84 router、103 装饰器、83 挂载；mock key / 内存限流 / 审计落文件缺口披露；独立样例 compose（standalone profile、回环 8000/8001、必填 `AI_API_KEYS`）；legacy 启动方式；禁止境外大模型与 PHI 脱敏红线 |
| `services/radar-inference/README.md` | 角色边界、demo/production 双模式、profile、8090 仅内网 expose、本机未构建说明；权重非商业许可与医师复核红线保留 |
| `miniprogram/README.md`（新建） | 8 页面清单、DevTools 构建前提、`touristappid` 占位、PHI 合规提示、不参与 compose 编排声明 |

### 5.4 本轮未改动的历史章节（保留原因）

- README 中里程碑叙事（200 / 296 版本、176/288 切片、覆盖率、P95、68 aggregator、v1.42~v4.97 版本记录表、学习引擎体系、M200 里程碑、v4.0 里程碑、功能全景模块表、技术沉淀、许可证与版权）属基线 §5 未列入虚报清单的历史自报口径，本轮保留；其中未独立复测数字见 §⑥ 声明。
- `DEPLOYMENT.md`、`DEPLOYMENT_GUIDE.md`、`SECURITY.md`、`OPERATIONS.md`、`docs/**/*.md` 归属其他代理，README 中仅保留引用链接，正文未改。

---

## ⑥ 遗留待办与边界说明

### 6.1 待办汇总（按责任侧分组）

**BFF / src 侧（其他代理边界，本轮只取证未改）**
1. P0-1：`DEMO_MODE=1` 在 `NODE_ENV=production` 下启动即退出；三处中间件统一生产判定。
2. P1-1：`sessionGuard` 断库 fail-open 改 fail-closed 或受限缓存 + 告警。
3. P2-5：旧品牌展示串 `jianlan-bff` iss 与注释随 src 批次替换。
4. P2-10：前端重复挂载路由去重（3052 挂载 − 2847 路径 = 205 处重复挂载，`web/src` 边界）。
5. 提供 BFF REST 路由实测条数，回填 README（本轮未写死）。

**部署 / 收口侧**
6. P0-2：proxy-addr 非破坏升级 + 信任网段复核（回归全绿后执行）。
7. P1-5：根 / web 依赖分批升级，门禁 = `tsc --noEmit` + `bun test` + `vitest run` 全绿；双锁文件同步；记录 antd 5 / React 19 兼容结论。
8. P1-2：多节点生产前补齐 PG/Redis/Kafka/ES 内部 TLS。
9. P1-4：K8s Secret 占位上线前替换，接入 External Secrets / Vault。
10. P1-6：CI 升级 Bun ≥1.4.2；P1-7：CI 接入 Maven OWASP dependency-check 与 pip-audit。
11. P2-6：`gangos_*` 指标表达式随 src 遥测重构统一改名 `jlmedaios_*`。

**Java / Python 旁路侧**
12. P1-3：单体 actuator 暴露面收敛 + `anyRequest()` 鉴权；需 Maven 回归环境。
13. P1-8：单体 Dockerfile 改多阶段 Maven 构建；补镜像内 wget/curl 落地健康检查。
14. P2-1：services-python 强制 API Key、Redis 限流、审计落库 / ELK、补齐非 `/ai/*` 鉴权。
15. P2-2：清理 1 个未挂载 Router。
16. P2-3：聚合模块 H2 console 在 standalone 发布前关闭。
17. P2-7：Java 单体 vLLM 端点改环境变量注入。
18. radar GPU 生产模式：下载 CC BY-NC-SA 4.0 权重、配置 CUDA、取消 compose GPU 段注释。
19. miniprogram：真实 AppID、备案、隐私协议、内容安全审核。

### 6.2 边界声明（本轮已遵守）

- **未删除旁路源码**：Java、Python、radar、miniprogram 全部保留原位，未物理删除、未强行合并主线。
- **未执行 `git add` / `git commit`**：本轮所有改动停留在工作树，未产生提交。
- **未创建或修改真实 `.env`**：根目录真实 `.env`（被 `.gitignore` 忽略）保持原样；本轮仅编辑 `.env.example`、`.env.compose.example`，示例值均为 `CHANGE_ME_*` 占位，不含真实口令。
- **未触碰禁止范围**：`src/**`、`web/src/**`、`web/package.json`、`tests/**`、根 `package.json`、`docs/**/*.md`（及 `DEPLOYMENT.md`、`DEPLOYMENT_GUIDE.md`、`SECURITY.md`、`verification-report/**`）只读取证，未写入。
- **未伪造构建 / 测试结果**：本机无 Maven、无 Docker、无 JDK 21、services-python 依赖未安装；Java 聚合/单体、Python 旁路、radar 镜像、compose 编排均**未能在本机独立构建或执行**，报告按此如实标注；radar 仅完成仓库内 `.venv` 的 import 冒烟（5 条路由可枚举），不等同镜像构建成功。
- **未扫描项如实记录**：Java/Maven 依赖、Python 依赖本轮未做漏洞扫描（无工具链 / 无扫描器），未编造 CVE 结论。

### 6.3 未独立复测口径声明

- README 里程碑中「累计开发切片 176 / 288」「测试覆盖率 97.92% / 99.5%」「P95 72ms」「68 个 aggregator 纯函数模块」等为 BFF 自报历史叙事，属 `src/`、`tests/` 边界，本轮未独立复测；保留在 README 历史章节中，不作为本轮实测结论。
- BFF REST 路由数以 BFF 侧代理实测清单为准；README 与本报告均未写死该数字。
- 前端 3052 挂载 / 2847 路径（2026-10-25 快照）为 `<Route path=` 正则统计口径，不等同页面数；`web/src` 处于并发迭代，数字随路由增删漂移；重复挂载清理属 `web/src` 边界。

### 6.4 收尾门禁复扫结果

- 允许范围旧品牌 / 旧端口 / 硬编码口令复扫：`jianlan-gangos|gang-os-web|jianlan-gang-os|jianlan-tech/gang-os|杠OS|Gang-OS|5433|changeit` 在 `deploy/`、`services-java/`、`services-python/`、`services/radar-inference/`、`miniprogram/`、两份 compose、两份 env 示例、两份 README 内 **0 命中**（vendor / node_modules / .venv / __pycache__ / target 已排除）。
- 四份 compose YAML 解析全部通过：基础档 17 服务、生产档 15 服务、monolith standalone 3 服务、python standalone 2 服务。
