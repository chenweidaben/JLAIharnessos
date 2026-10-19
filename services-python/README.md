# jlmedaios-ai-service

健澜科技智慧医疗 Python AI 服务（FastAPI + vLLM 本地推理）。

## 项目简介

本服务是健澜科技智慧医疗平台的 AI 能力层，基于 FastAPI 构建，对接本地 vLLM 推理引擎。
所有 AI 调用统一走本地 vLLM，禁止任何境外大模型 API 调用。

## 前置要求

- Python 3.11+
- pip

## 本地启动

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

1. **禁止境外大模型**：所有 AI 调用统一走本地 vLLM `http://vllm:8000/v1`，禁止 OpenAI / Claude / Gemini / Cohere 等境外 API
2. **PHI 脱敏**：所有入参必须先过 `app.core.sensitive.mask_phi` 脱敏，身份证号、手机号、姓名等 PHI 字段必须脱敏后才能进入 NLP/AI 流程
3. **vLLM 统一入口**：AI 推理统一通过 `LOCAL_VLLM_URL` 配置，不在业务代码中硬编码其他 endpoint

## Docker 启动

```bash
docker compose up -d
```

包含 ai-service (8000) + vllm-openai (8001，GPU 节点预留)。
