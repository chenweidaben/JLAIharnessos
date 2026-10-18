/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类前端页（M499-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI 缺陷自动分类（缺陷描述输入 + 分类结果展示）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ClassifyReport {
  category: string;
  confidence: number;
  level: string;
}

export default function EmrQcAiDefectClassifyPage() {
  const [text, setText] = useState("");
  const [report, setReport] = useState<ClassifyReport | null>(null);
  const [loading, setLoading] = useState(false);

  const classify = async () => {
    if (!text.trim()) {
      message.warning("请输入缺陷描述");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-defect-classify", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setReport(data?.data?.report ?? null);
        message.success("分类完成");
      } else {
        message.error("分类失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI 缺陷自动分类</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷描述输入">
          <TextArea
            rows={4}
            placeholder="请输入缺陷描述，例如：缺少主诉内容"
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={classify}>
            开始分类
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="分类结果">
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ marginRight: 8 }}>缺陷分类：</Text>
              <Tag color={VI.accent}>{report.category}</Tag>
            </div>
            <div style={{ marginBottom: 12 }}>
              <Text strong style={{ marginRight: 8 }}>置信度：</Text>
              <Tag color="blue">{(report.confidence * 100).toFixed(1)}%</Tag>
            </div>
            <div>
              <Text strong style={{ marginRight: 8 }}>置信等级：</Text>
              <Tag color={report.level === "高置信度" ? "green" : report.level === "中置信度" ? "orange" : "red"}>
                {report.level}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
