"""
健澜科技 jlmedaios AI 服务主入口。

合规红线：
- AI 接口统一走本地 vLLM，禁止境外大模型
- 所有 PHI 字段必须先过 sensitive.mask_phi 脱敏
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, nlp, cdss, imaging, encounter_memory

app = FastAPI(
    title="健澜AI原生医院操作系统OS",
    version="0.1.0"
)

# CORS 中间件（开发阶段允许所有源）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 注册路由
app.include_router(health.router)
app.include_router(nlp.router)
app.include_router(cdss.router)
app.include_router(imaging.router)
app.include_router(encounter_memory.router)


@app.on_event("startup")
async def startup_event():
    """启动时打印日志。"""
    print("AI service started on :8000")
