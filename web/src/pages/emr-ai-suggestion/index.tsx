/**
 * 健澜科技 jlmedaios - 病历AI生成建议前端页（M543-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI生成建议（病历ID/科室/病历类型/症状描述/AI建议/置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiSuggestion {
  recordId: string;
  dept: string;
}

interface SuggestionResult {
  suggestion: string;
  confidence: number;
}

interface SuggestionReport {
  suggestion: string;
  confidence: number;
}

export default function EmrAiSuggestionPage() {
  const [base, setBase] = useState<AiSuggestion | null>(null);
  const [recordType, setRecordType] = useState("入院记录");
  const [symptom, setSymptom] = useState("胸痛3天");
  const [result, setResult] = useState<SuggestionResult | null>(null);
  const [report, setReport] = useState<SuggestionReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-suggestion", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-suggestion", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ recordType, symptom }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("AI 建议生成完成");
      } else {
        message.error("AI 建议生成失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI生成建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>病历类型：</Text>
              <Input value={recordType} onChange={(e) => setRecordType(e.target.value)} style={{ width: 140, marginLeft: 8 }} />
            </div>
            <div>
              <Text strong>症状描述：</Text>
              <Input value={symptom} onChange={(e) => setSymptom(e.target.value)} style={{ width: 200, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGenerate}>
            生成 AI 建议
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <Row gutter={24}>
              <Col span={16}>
                <div style={{ padding: 12, background: VI.bg, borderRadius: 8 }}>
                  <Text strong>AI 建议：</Text>
                  <Text style={{ marginLeft: 8 }}>{report.suggestion}</Text>
                </div>
              </Col>
              <Col span={8}>
                <Statistic title="置信度" value={report.confidence} precision={2} valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
