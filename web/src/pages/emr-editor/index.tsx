/**
 * 健澜科技 jlmedaios - 电子病历书写页
 *
 * 集成专业医疗级病历编辑器，支持结构化模板、修订留痕、
 * 只读水印、AI 辅助等能力。品牌对外统一为「健澜病历编辑器」。
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useRef, useState, useCallback } from "react";
import { Layout, Typography, Card, Row, Col, Select, Input, Space, Tag, message } from "antd";
import { EmrEditor, EmrEditorRef } from "@/components/medical/EmrEditor";

const { Content } = Layout;
const { Title } = Typography;

const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const TEMPLATE_OPTIONS = [
  { value: "admission", label: "入院记录" },
  { value: "progress", label: "首次病程记录" },
  { value: "daily-round", label: "日常查房记录" },
  { value: "operation", label: "手术记录" },
  { value: "discharge", label: "出院记录" },
  { value: "consultation", label: "会诊记录" },
];

const DEPT_OPTIONS = [
  { value: "internal", label: "内科" },
  { value: "surgery", label: "外科" },
  { value: "pediatrics", label: "儿科" },
  { value: "obgyn", label: "妇产科" },
  { value: "orthopedics", label: "骨科" },
  { value: "neurology", label: "神经科" },
];

export default function EmrEditorPage() {
  const editorRef = useRef<EmrEditorRef>(null);
  const [template, setTemplate] = useState("admission");
  const [dept, setDept] = useState("internal");
  const [patientName, setPatientName] = useState("张*三");
  const [mrn, setMrn] = useState("MR20261116001");
  const [readOnly, setReadOnly] = useState(false);
  const [reviseMode, setReviseMode] = useState(true);
  const [content, setContent] = useState("");

  const templateLabel = TEMPLATE_OPTIONS.find((t) => t.value === template)?.label ?? "新建病历";

  const handleContentChange = useCallback((html: string) => {
    setContent(html);
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 16, maxWidth: 1200, margin: "0 auto" }}>
        <div style={{ marginBottom: 16 }}>
          <Title level={4} style={{ color: VI.deep, margin: 0 }}>电子病历书写</Title>
          <Space size="small" style={{ marginTop: 4 }}>
            <Tag color="blue">健澜AI原生医院操作系统OS</Tag>
            <Tag color="cyan">EMR 一体化</Tag>
            {reviseMode && <Tag color="green">修订模式</Tag>}
            {readOnly && <Tag color="orange">只读</Tag>}
          </Space>
        </div>

        <Card size="small" style={{ marginBottom: 12 }}>
          <Row gutter={[12, 12]} align="middle">
            <Col span={5}>
              <span style={{ color: "#666", fontSize: 13 }}>病历模板：</span>
              <Select
                value={template}
                onChange={setTemplate}
                options={TEMPLATE_OPTIONS}
                style={{ width: "calc(100% - 80px)" }}
                size="small"
              />
            </Col>
            <Col span={5}>
              <span style={{ color: "#666", fontSize: 13 }}>科室：</span>
              <Select
                value={dept}
                onChange={setDept}
                options={DEPT_OPTIONS}
                style={{ width: "calc(100% - 50px)" }}
                size="small"
              />
            </Col>
            <Col span={5}>
              <span style={{ color: "#666", fontSize: 13 }}>患者：</span>
              <Input
                value={patientName}
                onChange={(e) => setPatientName(e.target.value)}
                size="small"
                style={{ width: "calc(100% - 50px)" }}
              />
            </Col>
            <Col span={5}>
              <span style={{ color: "#666", fontSize: 13 }}>病案号：</span>
              <Input
                value={mrn}
                onChange={(e) => setMrn(e.target.value)}
                size="small"
                style={{ width: "calc(100% - 60px)" }}
              />
            </Col>
            <Col span={4} style={{ textAlign: "right" }}>
              <Space size="small">
                <a onClick={() => setReadOnly(!readOnly)} style={{ fontSize: 13 }}>
                  {readOnly ? "退出只读" : "只读"}
                </a>
                <a onClick={() => setReviseMode(!reviseMode)} style={{ fontSize: 13 }}>
                  {reviseMode ? "关闭修订" : "修订"}
                </a>
              </Space>
            </Col>
          </Row>
        </Card>

        <EmrEditor
          ref={editorRef}
          docCode={mrn}
          docTitle={`${templateLabel} - ${patientName}`}
          initialContent={content}
          readOnly={readOnly}
          reviseMode={reviseMode}
          height={640}
          onChange={handleContentChange}
          onReady={() => message.success("病历编辑器已就绪")}
        />
      </Content>
    </Layout>
  );
}
