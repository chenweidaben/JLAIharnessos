/**
 * 健澜科技 jlmedaios - 质控 AI 辅助书写建议明细前端页（M508-B，V14，EMR 深化四模块，-detail 避让）
 *
 * 深海蓝VI：AI 辅助书写建议（科室/章节输入+建议列表）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SuggestResult {
  suggestions: string[];
}

interface SuggestReport {
  dept: string;
  section: string;
  count: number;
}

export default function EmrQcAiWritingSuggestDetailPage() {
  const [dept, setDept] = useState("内科");
  const [section, setSection] = useState("主诉");
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [report, setReport] = useState<SuggestReport | null>(null);
  const [loading, setLoading] = useState(false);

  const doSuggest = async () => {
    if (!dept.trim() || !section.trim()) {
      message.warning("请输入科室和章节");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-writing-suggest-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ dept, section }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
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
        <Title level={3} style={{ color: VI.deep }}>AI 辅助书写建议</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入科室和章节">
          <Form layout="inline">
            <Form.Item label="科室">
              <Input placeholder="科室" value={dept} onChange={(e) => setDept(e.target.value)} />
            </Form.Item>
            <Form.Item label="章节">
              <Input placeholder="章节（如：主诉、现病史、手术记录）" value={section} onChange={(e) => setSection(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
                生成建议
              </Button>
            </Form.Item>
          </Form>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`建议列表（${report.dept} - ${report.section}，共 ${report.count} 条）`}>
            <List
              dataSource={result.suggestions}
              renderItem={(item, index) => (
                <List.Item>
                  <Tag color={VI.accent} style={{ width: 32 }}>{index + 1}</Tag>
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
