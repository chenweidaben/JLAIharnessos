/**
 * 健澜科技 jlmedaios - 质控 AI 书写建议前端页（M499-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI 书写建议（上下文输入 + 建议列表展示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SuggestReport {
  suggestions: string[];
  count: number;
}

export default function EmrQcAiWritingSuggestPage() {
  const [context, setContext] = useState("");
  const [report, setReport] = useState<SuggestReport | null>(null);
  const [loading, setLoading] = useState(false);

  const getSuggest = async () => {
    if (!context.trim()) {
      message.warning("请输入病历上下文");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-writing-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ context }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReport(data?.data?.report ?? null);
        message.success("建议生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI 书写建议</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="病历上下文输入">
          <TextArea
            rows={4}
            placeholder="请输入病历上下文，例如：主诉缺失"
            value={context}
            onChange={(e) => setContext(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={getSuggest}>
            生成建议
          </Button>
        </Card>
        {report && (
          <Card
            style={{ marginTop: 16 }}
            headStyle={{ background: VI.mid, color: "#fff" }}
            title={
              <span>
                书写建议列表
                <Tag color="default" style={{ marginLeft: 8 }}>共 {report.count} 条</Tag>
              </span>
            }
          >
            <List
              dataSource={report.suggestions}
              renderItem={(item, index) => (
                <List.Item>
                  <Tag color={VI.accent}>{index + 1}</Tag>
                  <Text>{item}</Text>
                </List.Item>
              )}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
