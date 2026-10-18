/**
 * 健澜科技 jlmedaios - 病历AI临床问答前端页（M545-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI临床问答（病历ID/科室/问题/AI回答/置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiClinicalQa {
  recordId: string;
  dept: string;
}

interface QaResult {
  answer: string;
  confidence: number;
}

interface QaReport {
  answer: string;
  confidence: number;
}

export default function EmrAiClinicalQaPage() {
  const [base, setBase] = useState<AiClinicalQa | null>(null);
  const [question, setQuestion] = useState("患者胸痛如何处理");
  const [result, setResult] = useState<QaResult | null>(null);
  const [report, setReport] = useState<QaReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-clinical-qa", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 临床问答基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAsk = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-clinical-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ question }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("问答完成");
      } else {
        message.error("问答失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI临床问答</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="提问输入">
          <div style={{ marginBottom: 16 }}>
            <Text strong>问题：</Text>
            <TextArea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              rows={3}
              style={{ marginTop: 8 }}
              placeholder="请输入临床问题"
            />
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAsk}>
            提问
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="AI回答">
            <Row gutter={24}>
              <Col span={16}>
                <Text style={{ fontSize: 16 }}>{report.answer}</Text>
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
