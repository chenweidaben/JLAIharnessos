/**
 * 健澜科技 jlmedaios - AI 病历摘要生成前端页（M486-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文 TextArea + 生成按钮 + AI 摘要输出。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiSummaryResult {
  content: string;
  summary: string;
}

interface AiSummaryReport {
  summaryLength: number;
  readTime: number;
}

export default function EmrAiSummaryPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<AiSummaryResult | null>(null);
  const [report, setReport] = useState<AiSummaryReport | null>(null);

  const generate = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("生成完成");
      }
    } catch {
      message.error("生成失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 病历摘要生成</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <TextArea
            rows={6}
            placeholder="请输入病历正文..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={generate} style={{ background: VI.accent }}>
            生成摘要
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Typography.Title level={4}>AI 摘要</Typography.Title>
            <Typography.Paragraph>{result.summary || "(空)"}</Typography.Paragraph>
            {report && (
              <>
                <Statistic title="摘要字数" value={report.summaryLength} />
                <Statistic title="阅读时间" value={report.readTime} suffix="分钟" style={{ marginTop: 12 }} />
              </>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
