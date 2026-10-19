"""
健澜科技 jlmedaios AI 服务主入口。

合规红线：
- AI 接口统一走本地 vLLM，禁止境外大模型
- 所有 PHI 字段必须先过 sensitive.mask_phi 脱敏
"""

from fastapi import FastAPI, Request, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.api import health, nlp, cdss, imaging, encounter_memory, ai_qc, ai_triage, ai_cds, ai_learning, ai_similar_cases, nlp_extract, imaging_ai, prediction, ai_brain, knowledge_graph, ai_scheduling, ai_quality_insight, ai_emergency_triage, monitoring, ai_diagnosis, ai_prescription_review, ai_medical_scribe, ai_medication_adherence, ai_health_brain, ai_resource_optimization, ai_symptom_check, ai_quality_forecast, ai_clinical_notes, ai_risk_score, ai_data_quality, ai_teaching_assistant, ai_patient_satisfaction, ai_disease_prediction, ai_hospital_operation, ai_knowledge_inference, ai_imaging_report, ai_surgery_risk, ai_nursing_decision, ai_infection_warning, ai_discharge_readiness, ai_pain_assessment, ai_workflow_optimizer, ai_dashboard_insight, ai_consent_assistant, ai_medical_quality, ai_system_health, ai_capacity_planning, ai_anomaly_detection, ai_cost_optimization, ai_data_privacy, ai_ehr_assessment, ai_interconnection_assessment, ai_security_monitoring
from app.core.api_key_auth import API_KEYS, check_rate_limit
from app.core.audit_middleware import AuditMiddleware

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

# 审计日志中间件（记录所有 /ai/* 请求到 audit.json，生产接 ELK/Loki）
app.add_middleware(AuditMiddleware)


# /ai/* 路由鉴权中间件（生产接 Redis 计数 + PostgreSQL 客户表，当前本地 mock）
@app.middleware("http")
async def api_key_middleware(request: Request, call_next):
    path = request.url.path
    if path.startswith("/ai/"):
        auth = request.headers.get("Authorization", "")
        if not auth.startswith("Bearer "):
            raise HTTPException(status_code=401, detail="Missing Bearer Token")
        api_key = auth.replace("Bearer ", "")
        if api_key not in API_KEYS:
            raise HTTPException(status_code=401, detail="Invalid API Key")
        if not check_rate_limit(api_key):
            raise HTTPException(status_code=429, detail="Rate limit exceeded")
    return await call_next(request)

# 注册路由
app.include_router(health.router)
app.include_router(nlp.router)
app.include_router(cdss.router)
app.include_router(imaging.router)
app.include_router(encounter_memory.router)

# AI 原生核心服务：质控/导诊/CDS
app.include_router(ai_qc.router)
app.include_router(ai_triage.router)
app.include_router(ai_cds.router)

# 诊疗沉淀学习闭环
app.include_router(ai_learning.router)
app.include_router(ai_similar_cases.router)

# AI 原生核心服务：病历NLP/影像AI/预后预测
app.include_router(nlp_extract.router)
app.include_router(imaging_ai.router)
app.include_router(prediction.router)

# AI 健康大脑
app.include_router(ai_brain.router)

# 医疗知识图谱
app.include_router(knowledge_graph.router)

# 智能排班辅助
app.include_router(ai_scheduling.router)

# 医疗质量 AI 洞察
app.include_router(ai_quality_insight.router)

# 急诊智能分诊
app.include_router(ai_emergency_triage.router)

# AI 服务健康检查和指标
app.include_router(monitoring.router)

# 辅助诊断推理
app.include_router(ai_diagnosis.router)

# 处方前置审核
app.include_router(ai_prescription_review.router)

# AI 病历书写助手
app.include_router(ai_medical_scribe.router)

# 用药依从性分析
app.include_router(ai_medication_adherence.router)

# AI 健康大脑深化
app.include_router(ai_health_brain.router)

# 资源优化建议
app.include_router(ai_resource_optimization.router)

# 智能预问诊
app.include_router(ai_symptom_check.router)

# 质量指标预测
app.include_router(ai_quality_forecast.router)

# AI 临床笔记结构化
app.include_router(ai_clinical_notes.router)

# 患者风险评分
app.include_router(ai_risk_score.router)

# 数据质量检查
app.include_router(ai_data_quality.router)

# AI 教学助手
app.include_router(ai_teaching_assistant.router)

# AI 满意度情感分析
app.include_router(ai_patient_satisfaction.router)

# 疾病预测
app.include_router(ai_disease_prediction.router)

# 医院运营预测
app.include_router(ai_hospital_operation.router)

# AI 知识推理
app.include_router(ai_knowledge_inference.router)

# AI 影像报告辅助
app.include_router(ai_imaging_report.router)

# AI 手术风险评估
app.include_router(ai_surgery_risk.router)

# AI 护理决策
app.include_router(ai_nursing_decision.router)

# AI 院感预警
app.include_router(ai_infection_warning.router)

# AI 出院准备度评估
app.include_router(ai_discharge_readiness.router)

# AI 疼痛评估辅助
app.include_router(ai_pain_assessment.router)

# AI 流程优化建议
app.include_router(ai_workflow_optimizer.router)

# AI 看板洞察
app.include_router(ai_dashboard_insight.router)

# AI 知情同意辅助
app.include_router(ai_consent_assistant.router)

# AI 病历质控
app.include_router(ai_medical_quality.router)

# AI 系统健康诊断
app.include_router(ai_system_health.router)

# AI 容量规划
app.include_router(ai_capacity_planning.router)

# AI 异常检测
app.include_router(ai_anomaly_detection.router)

# AI 成本优化
app.include_router(ai_cost_optimization.router)

# AI 数据隐私检测
app.include_router(ai_data_privacy.router)

# AI 电子病历评级辅助
app.include_router(ai_ehr_assessment.router)

# AI 互联互通评级辅助
app.include_router(ai_interconnection_assessment.router)

# AI 安全监控
app.include_router(ai_security_monitoring.router)


@app.on_event("startup")
async def startup_event():
    """启动时打印日志。"""
    print("AI service started on :8000")
