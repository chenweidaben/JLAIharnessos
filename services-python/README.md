# jlmedaios-ai-service（Python FastAPI 旁路/参考实现）

健澜科技 jlmedaios — 智慧医疗 Python AI 能力层参考实现（FastAPI + Uvicorn，对接本地 vLLM 推理引擎）。

> **角色边界**：本目录为旁路/参考实现，不进入主线默认 compose 编排；主线为 Bun + TypeScript BFF（`src/bff/`）+ React 工作台（`web/`）。主仓库 `docker-compose.yml` 中对应服务 `jlmedaios-ai` 归入 `legacy` profile，需显式 `--profile legacy` 启动；本目录自带的 `docker-compose.yml` 仅用于本地 ai-service + vLLM 配对调试。
>
> **本机构建状态**：本机 Python 3.13.16 在位，但 `requirements.txt` 依赖未安装，本服务**未能在本机独立启动/构建**；下表规模为命令实测统计（2026-10），不代表已完成本机回归。

## 实测规模（命令统计，2026-10）

| 口径 | 数值 | 统计方式 |
|---|---|---|
| 源码 `.py` | 92 | `app/**/*.py` |
| 测试 `.py` | 2 | `tests/`（`test_health.py`、`__init__.py`） |
| `APIRouter()` 声明 | 84 | 源码内 `APIRouter(` 出现次数 |
| 路由装饰器 | 103 | `@router.get` 16、`@router.post` 87（无 PUT/DELETE/PATCH/WS） |
| `include_router` 挂载 | 83 | `app/main.py` 内 `app.include_router(...)` 调用数 |

> 说明：存在少量「已声明 Router 但未在 `main.py` 挂载」的路由，属旁路清理待办，本轮不强行接线；完整挂载清单以 `app/main.py` 为准。

## 代表性业务路由分组

下表为主要业务前缀示例，**不是全量清单**（全量以 `app/main.py` 挂载关系为准）：

| 路由前缀 | 文件 | 代表端点 |
|---|---|---|
| / | health.py | GET /health |
| /nlp | nlp.py | POST /nlp/medical-correction, POST /nlp/medical-normalize |
| /cdss | cdss.py | POST /cdss/suggest |
| /imaging | imaging.py | POST /imaging/report |
| /memory | encounter_memory.py | POST /memory/feedback, GET /memory/suggestions/{patientId}, POST /memory/similar-cases |
| /ai/qc | ai_qc.py | POST /ai/qc/full-review, POST /ai/qc/dict-check |
| /ai/triage | ai_triage.py | POST /ai/triage/symptom, POST /ai/triage/emergency |
| /ai/cds | ai_cds.py | POST /ai/cds/drug-interaction, POST /ai/cds/dose-check, POST /ai/cds/contraindication |
| /ai/learning | ai_learning.py | POST /ai/learning/feedback, GET /ai/learning/adoption-rate, GET /ai/learning/high-value |
| /ai/similar | ai_similar_cases.py | POST /ai/similar/search, GET /ai/similar/outcome-predict |

## 前置要求

- Python 3.11+（镜像基线 `python:3.11-slim`）
- pip；依赖清单见 `requirements.txt`（fastapi、uvicorn[standard]、pydantic、sqlalchemy、asyncpg、redis、prometheus-client、httpx、pytest）

## 本地启动（具备 Python 环境且已安装依赖时）

```bash
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

访问健康检查：http://localhost:8000/health

## 跑测试

```bash
pytest tests/ -v
```

## curl 示例

### 健康检查
```bash
curl http://localhost:8000/health
```

### 医疗纠错
```bash
curl -X POST http://localhost:8000/nlp/medical-correction \
  -H "Content-Type: application/json" \
  -d '{"text": "患者咳素三天"}'
```

### CDSS 建议
```bash
curl -X POST http://localhost:8000/cdss/suggest \
  -H "Content-Type: application/json" \
  -d '{"symptom": "头痛", "department": "神经内科"}'
```

## 合规红线

1. **禁止境外大模型**：所有 AI 调用统一走本地 vLLM `http://vllm:8000/v1`，禁止 OpenAI / Claude / Gemini / Cohere 等境外 API；推理端点由 `LOCAL_VLLM_URL` 配置，不在业务代码中硬编码其他 endpoint。
2. **PHI 脱敏**：入参先过 `app.core.sensitive.mask_phi` 脱敏，身份证号、手机号、姓名等 PHI 字段脱敏后才能进入 NLP/AI 流程。
3. **API Key 鉴权**：`AI_API_KEYS` 环境变量未配置时，中间件回退到内置示例 mock key（`ak_mock_client_001/002`），**仅供本地调试**；任何对外或生产环境必须显式配置 `AI_API_KEYS`，并接入 Redis 计数与客户表（当前为进程内内存限流，属参考实现缺口）。
4. **审计留痕**：当前审计写入本地 `./data/audit.json` 文件，未落数据库、未接入 ELK；180 天留存等保要求未在本旁路落地，属参考实现缺口。

## Docker 启动

```bash
# 本目录独立编排（standalone profile）：ai-service (127.0.0.1:8000) + vllm-openai (127.0.0.1:8001，GPU 节点预留)
# 宿主端口仅回环绑定；启动前在 .env 配置 AI_API_KEYS（逗号分隔的 key:name:limit 清单），否则编排拒绝启动。
docker compose --profile standalone up -d
```

主仓库默认编排不拉起本服务；需要随主线旁路启动时，在仓库根目录执行：

```bash
docker compose --profile legacy up -d jlmedaios-ai
```
