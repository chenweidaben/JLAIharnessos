/**
 * 健澜科技 jlmedaios - 病历缺陷自动分类前端页（M470-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：缺陷文本输入框 + 分类结果卡片（分类名 + 置信度进度条）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Progress, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

export default function EmrDefectClassifierPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<{ category: string; confidence: number } | null>(null);
  const [loading, setLoading] = useState(false);

  const handleClassify = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-defect-classifier", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
      }
    } catch {
      // graceful
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历缺陷自动分类</Title>
        <Card title="输入缺陷文本" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Input.TextArea
            rows={4}
            placeholder="请输入缺陷描述，如：主诉缺失、诊断与症状矛盾..."
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <Button
            type="primary"
            style={{ marginTop: 16, background: VI.accent }}
            loading={loading}
            onClick={handleClassify}
          >
            自动分类
          </Button>
        </Card>
        {result && (
          <Card title="分类结果" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginTop: 16 }}>
            <Tag color="blue" style={{ fontSize: 14, padding: "4px 12px" }}>
              {result.category}
            </Tag>
            <div style={{ marginTop: 16, maxWidth: 400 }}>
              <Text type="secondary">置信度：{(result.confidence * 100).toFixed(0)}%</Text>
              <Progress percent={Math.round(result.confidence * 100)} strokeColor={VI.accent} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
