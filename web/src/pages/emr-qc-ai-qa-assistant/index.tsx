/**
 * 健澜科技 jlmedaios - 质控 AI 智能问答助手前端页（M508-D，V14，EMR 深化四模块，M508 收官）
 *
 * 深海蓝VI：AI 智能问答助手（问题输入+答案+置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Statistic, Tag, Typography, message } from "antd";
import { Input } from "antd";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QaResult {
  answer: string;
  confidence: number;
}

interface QaReport {
  question: string;
  answer: string;
  confidence: number;
}

export default function EmrQcAiQaAssistantPage() {
  const [question, setQuestion] = useState("病历签名要求");
  const [result, setResult] = useState<QaResult | null>(null);
  const [report, setReport] = useState<QaReport | null>(null);
  const [loading, setLoading] = useState(false);

  const doAsk = async () => {
    if (!question.trim()) {
      message.warning("请输入问题");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-qa-assistant", {
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
        message.success("回答完成");
      } else {
        message.error("回答失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI 智能问答助手</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入问题">
          <TextArea
            rows={3}
            placeholder="输入问题，如：病历签名要求、缺陷分级标准、质控流程..."
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAsk}>
            提问
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="回答结果">
            <Paragraph style={{ marginBottom: 16 }}>
              <Text strong style={{ color: VI.deep }}>问题：</Text>
              {report.question}
            </Paragraph>
            <Paragraph style={{ marginBottom: 16, fontSize: 16 }}>
              <Text strong style={{ color: VI.deep }}>答案：</Text>
              {result.answer}
            </Paragraph>
            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <Text strong>置信度：</Text>
              <Statistic
                value={result.confidence}
                suffix="%"
                valueStyle={{ color: result.confidence >= 90 ? "#3f8600" : result.confidence >= 80 ? "#1890ff" : "#faad14", fontSize: 20 }}
              />
              <Tag color={result.confidence >= 90 ? "green" : result.confidence >= 80 ? "blue" : "orange"}>
                {result.confidence >= 90 ? "高置信" : result.confidence >= 80 ? "中置信" : "低置信"}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
