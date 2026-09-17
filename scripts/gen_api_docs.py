# -*- coding: utf-8 -*-
"""生成健澜科技数智医院智能体 API 文档（36 工具 + 服务 + 适配器 + 索引）。
仅生成 Markdown，不修改业务代码。数据来源于 src/medical-tools 实际定义。"""
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
API = os.path.join(ROOT, "docs", "api")

# ---------------------------------------------------------------------------
# 36 个医疗工具元数据（与 src/medical-tools/registry.ts 一致）
# risk: low/medium/high；confirm/double 确认；perm 权限；roles 角色
# params: (字段, 类型, 必填, 说明)
# ---------------------------------------------------------------------------

TOOLS = [
    # ===== 患者管理 =====
    dict(slug="01-query-patient", name="query_patient", zh="查询患者", cat="患者管理",
         desc="根据患者ID、姓名、身份证号、性别、年龄范围等条件查询患者基本信息列表，支持模糊搜索和分页。返回脱敏后的患者数据。",
         risk="low", confirm=False, double=False, perm=["patient:read"], roles=["doctor", "nurse", "admin"],
         params=[("name", "string", "否", "患者姓名（支持模糊匹配）"),
                 ("patientId", "string", "否", "患者唯一ID"),
                 ("idCard", "string", "否", "身份证号（脱敏存储）"),
                 ("gender", "enum(男/女/未知)", "否", "性别"),
                 ("ageRange.min", "integer", "否", "最小年龄 0-150"),
                 ("ageRange.max", "integer", "否", "最大年龄 0-150"),
                 ("page", "integer", "否", "页码，默认 1"),
                 ("pageSize", "integer", "否", "每页条数，默认 10，最大 50")],
         out=[("success", "boolean", "是否成功"), ("total", "number", "总匹配数"),
              ("page", "number", "当前页码"), ("pageSize", "number", "每页条数"),
              ("data[]", "array", "患者列表（姓名已脱敏，如 李*英）")],
         errors=[("VALIDATION_ERROR", "至少提供一个查询条件"),
                 ("PERMISSION_DENIED", "缺少 patient:read 权限"),
                 ("RATE_LIMITED", "查询过于频繁，触发限流")]),
    dict(slug="02-get-patient-detail", name="get_patient_detail", zh="获取患者详情", cat="患者管理",
         desc="根据患者ID获取患者完整详情，包括基本信息、过敏史、当前用药、既往史、就诊信息等敏感信息（输出按数据分级脱敏）。",
         risk="low", confirm=False, double=False, perm=["patient:read"], roles=["doctor", "nurse"],
         params=[("patientId", "string", "是", "患者唯一ID"),
                 ("includeHistory", "boolean", "否", "是否包含就诊史，默认 false")],
         out=[("patientId", "string", "患者ID"), ("name", "string", "脱敏姓名"),
              ("gender/age", "string/number", "性别与年龄"), ("allergyHistory", "array", "过敏史列表"),
              ("currentMedications", "array", "当前用药列表"), ("encounters", "array", "就诊记录摘要")],
         errors=[("PATIENT_NOT_FOUND", "患者不存在"),
                 ("PERMISSION_DENIED", "缺少 patient:read 权限")]),
    dict(slug="03-get-patient-history", name="get_patient_history", zh="获取患者就诊史", cat="患者管理",
         desc="查询患者历史就诊记录，含历次门诊/住院诊断、医嘱摘要与随访情况，支持按时间范围与就诊类型过滤。",
         risk="low", confirm=False, double=False, perm=["patient:read"], roles=["doctor", "nurse"],
         params=[("patientId", "string", "是", "患者唯一ID"),
                 ("visitType", "enum", "否", "就诊类型：outpatient/emergency/inpatient/physical_exam/followup"),
                 ("startDate", "string(YYYY-MM-DD)", "否", "起始日期"),
                 ("endDate", "string(YYYY-MM-DD)", "否", "截止日期"),
                 ("page/pageSize", "integer", "否", "分页参数")],
         out=[("total", "number", "记录总数"), ("data[]", "array", "就诊史条目（诊断/科室/日期/摘要）")],
         errors=[("PATIENT_NOT_FOUND", "患者不存在"),
                 ("PERMISSION_DENIED", "缺少 patient:read 权限")]),

    # ===== 电子病历 =====
    dict(slug="04-get-medical-record", name="get_medical_record", zh="获取电子病历", cat="电子病历",
         desc="按就诊ID读取电子病历内容，返回结构化病历文本与书写时间线。",
         risk="low", confirm=False, double=False, perm=["emr:read"], roles=["doctor", "nurse"],
         params=[("encounterId", "string", "是", "就诊ID"),
                 ("recordType", "enum", "否", "病历类型：门诊/住院/病程/出院小结，默认全部")],
         out=[("encounterId", "string", "就诊ID"), ("records[]", "array", "病历列表（标题/内容/书写人/时间）")],
         errors=[("RECORD_NOT_FOUND", "病历不存在"),
                 ("PERMISSION_DENIED", "缺少 emr:read 权限")]),
    dict(slug="05-generate-medical-record", name="generate_medical_record", zh="AI生成病历", cat="电子病历",
         desc="基于患者主诉、现病史、检查结果等，由 AI 辅助生成结构化病历草稿，需医生确认后落库。",
         risk="medium", confirm=True, double=False, perm=["emr:write"], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"),
                 ("encounterId", "string", "是", "就诊ID"),
                 ("chiefComplaint", "string", "是", "主诉"),
                 ("presentIllness", "string", "否", "现病史"),
                 ("recordType", "enum", "否", "门诊病历/入院记录/病程记录，默认门诊病历"),
                 ("templateId", "string", "否", "引用病历模板ID")],
         out=[("recordId", "string", "生成的草稿ID"), ("content", "string", "AI 生成的病历正文"),
              ("confidence", "number", "内容置信度"), ("requiresConfirm", "boolean", "需医生确认")],
         errors=[("PERMISSION_DENIED", "缺少 emr:write 或非医生角色"),
                 ("VALIDATION_ERROR", "主诉为空或过短"),
                 ("MODEL_TIMEOUT", "大模型生成超时")]),
    dict(slug="06-medical-record-qa", name="medical_record_qa", zh="病历智能问答", cat="电子病历",
         desc="针对指定病历进行自然语言问答，基于病历上下文回答与诊疗相关的问题。",
         risk="low", confirm=False, double=False, perm=["qc:execute"], roles=["doctor", "nurse"],
         params=[("encounterId", "string", "是", "就诊ID"),
                 ("question", "string", "是", "针对病历的自然语言问题")],
         out=[("answer", "string", "回答内容"), ("citations", "array", "引用的病历片段")],
         errors=[("RECORD_NOT_FOUND", "病历不存在"),
                 ("VALIDATION_ERROR", "问题为空")]),
    dict(slug="07-get-medical-template", name="get_medical_template", zh="获取病历模板", cat="电子病历",
         desc="查询并获取按科室/类型分类的病历书写模板。",
         risk="low", confirm=False, double=False, perm=["emr:read"], roles=["doctor"],
         params=[("department", "string", "否", "科室名称"),
                 ("templateType", "enum", "否", "模板类型：门诊/入院/病程/手术记录")],
         out=[("templates[]", "array", "模板列表（模板ID/名称/正文）")],
         errors=[("PERMISSION_DENIED", "缺少 emr:read 权限")]),

    # ===== 医嘱管理 =====
    dict(slug="08-get-order-list", name="get_order_list", zh="查询医嘱列表", cat="医嘱管理",
         desc="按患者/就诊查询已开立医嘱，支持按医嘱状态与类型过滤。",
         risk="low", confirm=False, double=False, perm=["order:read"], roles=["doctor", "nurse", "pharmacist"],
         params=[("patientId", "string", "否", "患者ID"),
                 ("encounterId", "string", "否", "就诊ID"),
                 ("status", "enum", "否", "已开立/执行中/已停止/已作废"),
                 ("orderType", "enum", "否", "药品/检查/检验/治疗/护理/手术")],
         out=[("orders[]", "array", "医嘱列表（ID/内容/状态/开立人/时间）")],
         errors=[("PERMISSION_DENIED", "缺少 order:read 权限")]),
    dict(slug="09-create-order", name="create_order", zh="开具医嘱", cat="医嘱管理",
         desc="开具药品/检查/检验/治疗/护理/手术/输血等医嘱。高风险操作，需双重确认与执业医师资格校验；自动执行 CDS 安全检查（药物相互作用、禁忌症、过敏、剂量异常），药品医嘱需药师审核。",
         risk="high", confirm=True, double=True, perm=["order:create"], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"), ("encounterId", "string", "是", "就诊ID"),
                 ("orderType", "enum", "是", "药品/检查/检验/治疗/护理/手术/输血/其他"),
                 ("orderContent", "string", "是", "医嘱内容（如 阿司匹林肠溶片100mg qd 口服）"),
                 ("dosage", "string", "否", "剂量（药品医嘱）"),
                 ("frequency", "string", "否", "频次 qd/bid/tid/q4h/prn"),
                 ("duration", "string", "否", "疗程（如 7天）"),
                 ("startDate", "string(YYYY-MM-DD)", "否", "开始日期，默认当天"),
                 ("priority", "enum", "否", "普通/急/即刻，默认普通"),
                 ("clinicalIndication", "string", "是", "临床指征/开单原因")],
         out=[("orderId", "string", "医嘱ID"), ("status", "enum", "已开立/待审核/已驳回"),
              ("safetyCheck", "object", "相互作用/禁忌/过敏/剂量预警"),
              ("requiresPharmacistReview", "boolean", "是否需药师审核"),
              ("requiresDoubleConfirm", "boolean", "是否需双重确认")],
         errors=[("PATIENT_NOT_FOUND", "患者不存在"), ("LICENSE_REQUIRED", "仅执业医师可开具医嘱"),
                 ("SAFETY_BLOCKED", "存在严重过敏/禁忌，医嘱被阻止"),
                 ("PERMISSION_DENIED", "缺少 order:create 权限")]),
    dict(slug="10-cancel-order", name="cancel_order", zh="作废医嘱", cat="医嘱管理",
         desc="作废已开立但未执行完毕的医嘱。高风险操作，需双重确认与作废原因，执行联动通知护士与药房。",
         risk="high", confirm=True, double=True, perm=["order:cancel"], roles=["doctor"],
         params=[("orderId", "string", "是", "待作废医嘱ID"),
                 ("reason", "string", "是", "作废原因（必填）")],
         out=[("orderId", "string", "医嘱ID"), ("status", "string", "作废后状态"),
              ("notifiedRoles", "array", "已通知的角色")],
         errors=[("ORDER_NOT_FOUND", "医嘱不存在"), ("ORDER_ALREADY_EXECUTED", "医嘱已执行，不可作废"),
                 ("LICENSE_REQUIRED", "仅执业医师可作废医嘱"),
                 ("PERMISSION_DENIED", "缺少 order:cancel 权限")]),
    dict(slug="11-order-audit", name="order_audit", zh="医嘱审核", cat="医嘱管理",
         desc="对上级/下级或药师视角的医嘱进行审核通过或驳回，记录审核意见。",
         risk="medium", confirm=True, double=False, perm=["order:audit"], roles=["doctor", "pharmacist"],
         params=[("orderId", "string", "是", "待审核医嘱ID"),
                 ("decision", "enum", "是", "approve/reject"),
                 ("comment", "string", "否", "审核意见")],
         out=[("orderId", "string", "医嘱ID"), ("status", "string", "审核后状态"),
              ("auditedBy", "string", "审核人")],
         errors=[("ORDER_NOT_FOUND", "医嘱不存在"), ("PERMISSION_DENIED", "缺少 order:audit 权限")]),

    # ===== 处方药品 =====
    dict(slug="12-create-prescription", name="create_prescription", zh="开具处方", cat="处方药品",
         desc="开具药品处方，支持普通/特殊/麻醉级别。高风险操作，需双重确认、执业医师资格与处方权校验，并自动执行合理用药检查。",
         risk="high", confirm=True, double=True, perm=["prescription:create"], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"), ("encounterId", "string", "是", "就诊ID"),
                 ("items[]", "array", "是", "处方明细（药品/规格/剂量/用法/数量）"),
                 ("diagnosis", "string", "是", "临床诊断"),
                 ("prescriptionType", "enum", "否", "普通/特殊/麻醉，默认普通")],
         out=[("prescriptionId", "string", "处方ID"), ("status", "string", "待药师审核/已开立"),
              ("safetyCheck", "object", "相互作用/禁忌/过敏/剂量预警"),
              ("requiresDoubleConfirm", "boolean", "需双重确认")],
         errors=[("PRESCRIPTION_RIGHT_REQUIRED", "无相应级别处方权"),
                 ("SAFETY_BLOCKED", "合理用药检查未通过"),
                 ("PERMISSION_DENIED", "缺少 prescription:create 权限")]),
    dict(slug="13-prescription-audit", name="prescription_audit", zh="处方审核", cat="处方药品",
         desc="药师对处方进行合理性审核，通过或退回修改，记录审核结论。",
         risk="medium", confirm=True, double=False, perm=["prescription:audit"], roles=["pharmacist"],
         params=[("prescriptionId", "string", "是", "待审核处方ID"),
                 ("decision", "enum", "是", "approve/reject"),
                 ("reviewNote", "string", "否", "审核意见/退回原因")],
         out=[("prescriptionId", "string", "处方ID"), ("status", "string", "审核后状态")],
         errors=[("PRESCRIPTION_NOT_FOUND", "处方不存在"),
                 ("PERMISSION_DENIED", "缺少 prescription:audit 权限（仅药师）")]),
    dict(slug="14-get-prescription-list", name="get_prescription_list", zh="查询处方列表", cat="处方药品",
         desc="按患者/状态查询处方列表，供医生与药师查看。",
         risk="low", confirm=False, double=False, perm=["prescription:read"], roles=["doctor", "pharmacist"],
         params=[("patientId", "string", "否", "患者ID"), ("status", "enum", "否", "待审核/已审核/已发药/已作废"),
                 ("page/pageSize", "integer", "否", "分页")],
         out=[("prescriptions[]", "array", "处方列表")],
         errors=[("PERMISSION_DENIED", "缺少 prescription:read 权限")]),
    dict(slug="15-get-drug-info", name="get_drug_info", zh="查询药品信息", cat="处方药品",
         desc="按药品名称/编码查询药品字典，含适应症、用法用量、禁忌、相互作用等。",
         risk="low", confirm=False, double=False, perm=["drug:read"], roles=["doctor", "pharmacist", "nurse"],
         params=[("drugName", "string", "否", "药品名称（模糊）"),
                 ("drugCode", "string", "否", "药品编码")],
         out=[("drugs[]", "array", "药品字典条目")],
         errors=[("PERMISSION_DENIED", "缺少 drug:read 权限")]),

    # ===== 检验检查 =====
    dict(slug="16-get-lab-result", name="get_lab_result", zh="获取检验结果", cat="检验检查",
         desc="查询患者检验报告结果，含参考区间与异常标记，支持按项目过滤。",
         risk="low", confirm=False, double=False, perm=["lab:read"], roles=["doctor", "nurse", "technician"],
         params=[("patientId", "string", "是", "患者ID"),
                 ("testItem", "string", "否", "检验项目名称"),
                 ("startDate/endDate", "string", "否", "时间范围")],
         out=[("results[]", "array", "检验结果（项目/结果/单位/参考区间/异常标志）"),
              ("criticalFlags", "array", "危急值标记")],
         errors=[("PATIENT_NOT_FOUND", "患者不存在"),
                 ("PERMISSION_DENIED", "缺少 lab:read 权限")]),
    dict(slug="17-get-image-report", name="get_image_report", zh="获取影像报告", cat="检验检查",
         desc="查询患者影像检查诊断报告文本与结论。",
         risk="low", confirm=False, double=False, perm=["imaging:read"], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"),
                 ("studyId", "string", "否", "影像检查号")],
         out=[("reports[]", "array", "影像报告（部位/结论/建议/报告医生）")],
         errors=[("PERMISSION_DENIED", "缺少 imaging:read 权限")]),
    dict(slug="18-order-lab-test", name="order_lab_test", zh="开立检验申请", cat="检验检查",
         desc="医生向 LIS 发起检验申请单，需确认并联动患者收费。",
         risk="medium", confirm=True, double=False, perm=["lab:order"], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"), ("encounterId", "string", "是", "就诊ID"),
                 ("items[]", "array", "是", "检验项目列表"),
                 ("clinicalIndication", "string", "否", "临床指征"),
                 ("urgent", "boolean", "否", "是否急诊加急")],
         out=[("orderId", "string", "检验申请ID"), ("status", "string", "已提交/待采样")],
         errors=[("LICENSE_REQUIRED", "仅执业医师可开立"),
                 ("LIS_UNAVAILABLE", "LIS 接口不可用"),
                 ("PERMISSION_DENIED", "缺少 lab:order 权限")]),
    dict(slug="19-order-imaging-exam", name="order_imaging_exam", zh="开立影像检查申请", cat="检验检查",
         desc="医生向 PACS/放射科发起影像检查申请（CT/MR/DR/超声等）。",
         risk="medium", confirm=True, double=False, perm=["imaging:order"], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"), ("encounterId", "string", "是", "就诊ID"),
                 ("examType", "enum", "是", "CT/MR/DR/超声/内镜等"),
                 ("bodyPart", "string", "是", "检查部位"),
                 ("clinicalIndication", "string", "否", "临床指征"),
                 ("urgent", "boolean", "否", "是否加急")],
         out=[("orderId", "string", "检查申请ID"), ("appointmentTime", "string", "预约时间")],
         errors=[("LICENSE_REQUIRED", "仅执业医师可开立"),
                 ("PACS_UNAVAILABLE", "PACS 接口不可用"),
                 ("PERMISSION_DENIED", "缺少 imaging:order 权限")]),
    dict(slug="20-view-dicom", name="view_dicom", zh="调阅DICOM影像", cat="检验检查",
         desc="通过 PACS 网关调阅 DICOM 影像元数据与序列索引（不直接返回像素流，按权限返回可访问句柄）。",
         risk="low", confirm=False, double=False, perm=["imaging:read"], roles=["doctor", "technician"],
         params=[("studyId", "string", "是", "检查检查号/Study Instance UID")],
         out=[("study", "object", "影像检查元数据"), ("series[]", "array", "序列列表"),
              ("retrieveUrl", "string", "WADO-RS 调阅句柄")],
         errors=[("STUDY_NOT_FOUND", "影像检查不存在"),
                 ("PACS_UNAVAILABLE", "PACS/DICOM 网关不可用")]),

    # ===== 临床决策支持 =====
    dict(slug="21-drug-interaction-check", name="drug_interaction_check", zh="药物相互作用检查", cat="临床决策支持",
         desc="对一组当前用药与拟用药物进行相互作用筛查，输出风险等级与处置建议。",
         risk="low", confirm=False, double=False, perm=[], roles=["doctor", "pharmacist"],
         params=[("currentDrugs", "array<string>", "是", "当前用药列表"),
                 ("proposedDrugs", "array<string>", "是", "拟用药物列表")],
         out=[("interactions[]", "array", "相互作用（药物对/风险等级/机制/建议）"),
              ("overallRisk", "enum", "safe/caution/contraindicated")],
         errors=[("VALIDATION_ERROR", "用药列表为空")]),
    dict(slug="22-diagnosis-suggestion", name="diagnosis_suggestion", zh="诊断建议", cat="临床决策支持",
         desc="基于患者症状、体征、检验检查结果，由 CDS 引擎给出可能诊断鉴别列表与置信度。",
         risk="low", confirm=False, double=False, perm=[], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"),
                 ("symptoms", "array<string>", "是", "症状/体征列表"),
                 ("labResults", "array", "否", "关键检验结果")],
         out=[("suggestions[]", "array", "鉴别诊断（诊断/置信度/依据）"),
              ("disclaimer", "string", "仅供参考，需医生确认")],
         errors=[("VALIDATION_ERROR", "症状为空")]),
    dict(slug="23-treatment-plan-suggestion", name="treatment_plan_suggestion", zh="治疗方案建议", cat="临床决策支持",
         desc="基于诊断与指南知识库，推荐治疗方案、用药路径与注意事项。",
         risk="low", confirm=False, double=False, perm=[], roles=["doctor"],
         params=[("patientId", "string", "是", "患者ID"),
                 ("diagnosis", "string", "是", "确定/疑似诊断"),
                 ("patientFactors", "object", "否", "年龄/合并症/肝肾功能等")],
         out=[("plans[]", "array", "治疗方案（推荐用药/疗程/监测点）"),
              ("references", "array", "指南/文献来源")],
         errors=[("VALIDATION_ERROR", "诊断为空")]),
    dict(slug="24-critical-value-alert", name="critical_value_alert", zh="危急值提醒", cat="临床决策支持",
         desc="拉取当前患者/科室待处理危急值清单，生成提醒并跟踪处置时效。",
         risk="low", confirm=False, double=False, perm=[], roles=["doctor", "nurse"],
         params=[("patientId", "string", "否", "指定患者（为空则查本科室）"),
                 ("department", "string", "否", "科室")],
         out=[("alerts[]", "array", "危急值（项目/结果/阈值/上报时间/处理状态）"),
              ("unhandledCount", "number", "未处理数量")],
         errors=[("NONE", "无危急值时返回空列表")]),

    # ===== 质控管理 =====
    dict(slug="25-medical-record-quality-check", name="medical_record_quality_check", zh="病历质量检查", cat="质控管理",
         desc="对病历运行环节进行内涵质控，输出缺陷项与扣分，辅助医生实时整改。",
         risk="low", confirm=False, double=False, perm=[], roles=["doctor", "admin"],
         params=[("encounterId", "string", "是", "就诊ID"),
                 ("checkItems", "array<string>", "否", "指定检查项（默认全部）")],
         out=[("score", "number", "质控得分"), ("defects[]", "array", "缺陷项（位置/级别/建议）")],
         errors=[("RECORD_NOT_FOUND", "病历不存在")]),
    dict(slug="26-medical-record-front-page-check", name="medical_record_front_page_check", zh="病案首页质控", cat="质控管理",
         desc="对出院病案首页进行逻辑校验，检测主要诊断/手术/费用一致性问题。",
         risk="low", confirm=False, double=False, perm=[], roles=["admin", "doctor"],
         params=[("patientId", "string", "是", "患者ID"), ("encounterId", "string", "是", "就诊ID")],
         out=[("issues[]", "array", "首页逻辑问题"), ("pass", "boolean", "是否通过")],
         errors=[("RECORD_NOT_FOUND", "病历不存在")]),
    dict(slug="27-core-system-check", name="core_system_check", zh="核心制度落实检查", cat="质控管理",
         desc="检查三级查房、查对、交接班、危急值等医疗核心制度落实情况。",
         risk="low", confirm=False, double=False, perm=[], roles=["admin"],
         params=[("department", "string", "否", "科室"), ("period", "string", "否", "统计周期")],
         out=[("items[]", "array", "各制度落实率与问题")],
         errors=[("PERMISSION_DENIED", "仅质控管理员可用")]),

    # ===== 患者服务 =====
    dict(slug="28-appointment-registration", name="appointment_registration", zh="预约挂号", cat="患者服务",
         desc="为患者预约指定医生/科室号源并完成挂号登记。",
         risk="medium", confirm=True, double=False, perm=["appointment:create"], roles=["doctor", "admin", "nurse"],
         params=[("patientId", "string", "是", "患者ID"), ("department", "string", "是", "科室"),
                 ("doctorId", "string", "否", "医生"), ("scheduleTime", "string", "是", "预约时段")],
         out=[("appointmentId", "string", "挂号ID"), ("status", "string", "预约成功/已确认")],
         errors=[("SLOT_FULL", "号源已满"), ("PERMISSION_DENIED", "缺少 appointment:create 权限")]),
    dict(slug="29-visit-reminder", name="visit_reminder", zh="就诊提醒", cat="患者服务",
         desc="对预约/复诊患者生成就诊提醒任务（短信/院内消息）。",
         risk="low", confirm=False, double=False, perm=["appointment:read", "followup:read"], roles=["admin", "nurse"],
         params=[("patientId", "string", "是", "患者ID"), ("remindType", "enum", "是", "预约提醒/复诊提醒/随访提醒")],
         out=[("reminderId", "string", "提醒任务ID"), ("channel", "string", "发送渠道")],
         errors=[("PERMISSION_DENIED", "缺少相应权限")]),
    dict(slug="30-follow-up-management", name="follow_up_management", zh="随访管理", cat="患者服务",
         desc="创建/查询患者随访计划与随访记录。",
         risk="low", confirm=False, double=False, perm=["followup:read", "followup:write"], roles=["doctor", "nurse"],
         params=[("patientId", "string", "是", "患者ID"), ("action", "enum", "是", "create/query"),
                 ("plan", "object", "否", "随访计划内容")],
         out=[("followUpId", "string", "随访ID"), ("records[]", "array", "随访记录")],
         errors=[("PERMISSION_DENIED", "缺少 followup 权限")]),

    # ===== 运营管理 =====
    dict(slug="31-department-operation-analysis", name="department_operation_analysis", zh="科室运营分析", cat="运营管理",
         desc="输出科室门诊量、床位使用率、平均住院日等运营指标分析。",
         risk="low", confirm=False, double=False, perm=["operation:read"], roles=["admin"],
         params=[("department", "string", "否", "科室（为空则全院）"), ("period", "string", "是", "统计周期")],
         out=[("metrics", "object", "运营指标集合"), ("trend", "array", "环比趋势")],
         errors=[("PERMISSION_DENIED", "缺少 operation:read 权限")]),
    dict(slug="32-medical-quality-indicators", name="medical_quality_indicators", zh="医疗质量指标", cat="运营管理",
         desc="汇总 DRG、合理用药、平均住院日、非计划重返等医疗质量关键指标。",
         risk="low", confirm=False, double=False, perm=["quality:read"], roles=["admin"],
         params=[("period", "string", "是", "统计周期"), ("department", "string", "否", "科室")],
         out=[("indicators[]", "array", "指标（名称/数值/目标值/达标）")],
         errors=[("PERMISSION_DENIED", "缺少 quality:read 权限")]),
    dict(slug="33-drg-dip-analysis", name="drg_dip_analysis", zh="DRG/DIP分析", cat="运营管理",
         desc="按 DRG/DIP 分组分析病组盈亏、费用结构与效率。",
         risk="low", confirm=False, double=False, perm=["drg:read"], roles=["admin"],
         params=[("period", "string", "是", "统计周期"), ("groupCode", "string", "否", "DRG/DIP 病组")],
         out=[("groups[]", "array", "病组分析（权重/费用/盈亏/住院日）")],
         errors=[("PERMISSION_DENIED", "缺少 drg:read 权限")]),

    # ===== 系统集成 =====
    dict(slug="34-sync-to-his", name="sync_to_his", zh="同步数据到HIS", cat="系统集成",
         desc="将本系统产生的病历/医嘱/处方结果回写 HIS，需确认并经集成总线字段映射。",
         risk="medium", confirm=True, double=False, perm=["integration:write"], roles=["admin", "doctor"],
         params=[("source", "enum", "是", "medical_record/order/prescription"),
                 ("bizId", "string", "是", "业务单据ID"),
                 ("target", "string", "否", "目标 HIS（Weining/Donghua/Chuangye/Lianzhong/Zhiye）")],
         out=[("syncId", "string", "同步任务ID"), ("status", "string", "success/failed"),
              ("mappedFields", "number", "映射字段数")],
         errors=[("HIS_UNAVAILABLE", "HIS 接口不可用"),
                 ("MAPPING_ERROR", "字段映射失败"),
                 ("PERMISSION_DENIED", "缺少 integration:write 权限")]),
    dict(slug="35-fetch-from-emr", name="fetch_from_emr", zh="从EMR拉取数据", cat="系统集成",
         desc="通过 EMR 适配器从源 EMR 拉取患者病历与就诊数据，供本系统融合。",
         risk="low", confirm=False, double=False, perm=["integration:read"], roles=["admin", "doctor"],
         params=[("patientId", "string", "是", "患者ID"),
                 ("dataTypes", "array<string>", "否", "数据类型：record/order/result")],
         out=[("records[]", "array", "拉取到的 EMR 数据")],
         errors=[("EMR_UNAVAILABLE", "EMR 接口不可用"),
                 ("PERMISSION_DENIED", "缺少 integration:read 权限")]),
    dict(slug="36-hl7-message-send", name="hl7_message_send", zh="发送HL7消息", cat="系统集成",
         desc="构造并发送 HL7 v2 消息（如 ADT/ORM/ORU）到下游系统，需确认。",
         risk="medium", confirm=True, double=False, perm=["integration:write"], roles=["admin"],
         params=[("messageType", "enum", "是", "ADT^A04/ORM^O01/ORU^R01 等"),
                 ("payload", "object", "是", "消息业务载荷"),
                 ("destination", "string", "是", "接收端 MLLP 地址 host:port")],
         out=[("messageControlId", "string", "消息控制ID"), ("ack", "object", "下游 ACK 响应")],
         errors=[("HL7_PARSE_ERROR", "消息构造/解析失败"),
                 ("DESTINATION_UNREACHABLE", "下游 MLLP 不可达")]),
]

CAT_ORDER = ["患者管理", "电子病历", "医嘱管理", "处方药品", "检验检查",
             "临床决策支持", "质控管理", "患者服务", "运营管理", "系统集成"]

RISK_ZH = {"low": "低（只读/查询类）", "medium": "中（需用户确认）", "high": "高（需双重确认+资格校验）"}


def tool_doc(t):
    rows = "\n".join(
        f"| {p[0]} | {p[1]} | {p[2]} | {p[3]} |" for p in t["params"])
    out_rows = "\n".join(
        f"| {o[0]} | {o[1]} | {o[2]} |" for o in t["out"])
    err_rows = "\n".join(
        f"| {e[0]} | {e[1]} |" for e in t["errors"])
    perms = ", ".join(f"`{p}`" for p in t["perm"]) if t["perm"] else "无（公开只读）"
    roles = ", ".join(t["roles"]) if t["roles"] else "无角色限制"
    double = "是" if t["double"] else "否（由风险等级自动决定，high 自动启用双重确认）"
    example_input = "{\n  \"patientId\": \"P20260001\",\n  \"encounterId\": \"E20260916001\"\n}"
    return f"""# {t['name']} — {t['zh']}

> 所属分类：**{t['cat']}** ｜ 工具名：`{t['name']}` ｜ 风险等级：**{t['risk'].upper()}**（{RISK_ZH[t['risk']]}）

## 工具描述

{t['desc']}

## 安全与权限

| 项目 | 取值 |
| --- | --- |
| 风险等级 | `{t['risk']}` |
| 需要登录认证 | 是 |
| 需要用户确认 | {'是' if t['confirm'] else '否'} |
| 需要双重确认 | {double} |
| 所需权限 | {perms} |
| 适用角色 | {roles} |
| 是否只读 | {'是' if t['risk'] == 'low' else '否'} |

> 高风险工具（`riskLevel=high`）由 `buildMedicalTool` 自动启用双重确认（`requiresDoubleConfirm`），执行前必须经执业医师资格校验与二次确认，并全程记录审计日志。

## 输入参数

| 字段 | 类型 | 必填 | 说明 |
| --- | --- | --- | --- |
{rows}

## 输出参数

| 字段 | 类型 | 说明 |
| --- | --- | --- |
{out_rows}

> 统一返回包装：`{{ "success": boolean, "data": ... , "error": {{ code, message, details? }} }}`。

## 错误码

| 错误码 | 含义 |
| --- | --- |
{err_rows}
| PERMISSION_DENIED | 权限不足或角色不匹配 |
| VALIDATION_ERROR | 入参未通过 Zod Schema 校验 |
| INTERNAL_ERROR | 服务内部异常（已记录 traceId） |

## 使用示例

### 调用示例（Agent 工具调用）

```json
{{
  "name": "{t['name']}",
  "input": {example_input}
}}
```

### 成功返回示例

```json
{{
  "success": true,
  "data": {{ "tool": "{t['name']}", "status": "ok" }}
}}
```

### 失败返回示例

```json
{{
  "success": false,
  "error": {{ "code": "PERMISSION_DENIED", "message": "缺少所需权限" }}
}}
```

---

*健澜科技数智医院智能体 · 工具 API 文档 · 分类：{t['cat']}*
"""


def main():
    count = 0
    for t in TOOLS:
        path = os.path.join(API, "tools", f"{t['slug']}-{t['name']}.md")
        with open(path, "w", encoding="utf-8") as f:
            f.write(tool_doc(t))
        count += 1
    print(f"generated {count} tool docs")


if __name__ == "__main__":
    main()
