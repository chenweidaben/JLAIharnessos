/**
 * 健澜科技 jlmedaios - AI 病历关键词提取前端页（M486-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历正文 TextArea + 提取按钮 + 关键词标签 Tag 列表。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiKeywordResult {
  content: string;
  keywords: string[];
}

interface AiKeywordReport {
  keywordCount: number;
  topKeywords: string[];
}

export default function EmrAiKeywordPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<AiKeywordResult | null>(null);
  const [report, setReport] = useState<AiKeywordReport | null>(null);

  const extract = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-keyword", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("提取完成");
      }
    } catch {
      message.error("提取失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 病历关键词提取</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <TextArea
            rows={6}
            placeholder="请输入病历正文..."
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={extract} style={{ background: VI.accent }}>
            提取关键词
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title="关键词数" value={report.keywordCount} />
            {result && result.keywords.length > 0 && (
              <div style={{ marginTop: 16 }}>
                {result.keywords.map((kw) => (
                  <Tag key={kw} color="blue" style={{ marginBottom: 8 }}>{kw}</Tag>
                ))}
              </div>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
