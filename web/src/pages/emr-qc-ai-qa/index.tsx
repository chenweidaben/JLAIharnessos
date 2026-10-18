/**
 * 健澜科技 jlmedaios - 质控 AI 知识问答前端页（M499-D，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI 知识问答（问题输入 + 答案展示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QaReport {
  question: string;
  answer: string;
  source: string;
}

export default function EmrQcAiQaPage() {
  const [question, setQuestion] = useState("");
  const [report, setReport] = useState<QaReport | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = async () => {
    if (!question.trim()) {
      message.warning("请输入问题");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-qa", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ question }),
      });
      if (resp.ok) {
        const data = await resp.json();
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
        <Title level={3} style={{ color: VI.deep }}>AI 知识问答</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="问题输入">
          <TextArea
            rows={3}
            placeholder="请输入问题，例如：什么是甲级病历？"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={ask}>
            提问
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="问答结果">
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ marginRight: 8 }}>问题：</Text>
              <Text>{report.question}</Text>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ marginRight: 8 }}>答案：</Text>
              <Text>{report.answer}</Text>
            </div>
            <div>
              <Text strong style={{ marginRight: 8 }}>来源：</Text>
              <Tag color={VI.accent}>{report.source}</Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
