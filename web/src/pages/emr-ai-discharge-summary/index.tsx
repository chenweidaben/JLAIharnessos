/**
 * 健澜科技 jlmedaios - 病历AI出院小结生成前端页（M547-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI出院小结生成（病历ID/科室/诊断/治疗经过/AI生成小结/字数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDischargeSummary {
  recordId: string;
  dept: string;
}

interface SummaryResult {
  summary: string;
  length: number;
}

interface SummaryReport {
  summary: string;
  length: number;
}

export default function EmrAiDischargeSummaryPage() {
  const [base, setBase] = useState<AiDischargeSummary | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [treatment, setTreatment] = useState("PCI手术");
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [report, setReport] = useState<SummaryReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-discharge-summary", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 出院小结基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-discharge-summary", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, treatment }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("出院小结生成完成");
      } else {
        message.error("出院小结生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI出院小结生成</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 300, marginLeft: 8 }} />
          </div>
          <div style={{ marginBottom: 16 }}>
            <Text strong>治疗经过：</Text>
            <TextArea
              value={treatment}
              onChange={(e) => setTreatment(e.target.value)}
              rows={3}
              style={{ width: 400, marginLeft: 8 }}
            />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGenerate}>
            生成出院小结
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="AI 生成小结">
            <Row gutter={24}>
              <Col span={18}>
                <Paragraph style={{ fontSize: 16, lineHeight: 1.8 }}>{report.summary}</Paragraph>
              </Col>
              <Col span={6}>
                <Statistic title="字数" value={report.length} suffix="字" valueStyle={{ color: VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
