/**
 * 健澜科技 jlmedaios - 质控 AI 缺陷自动分类明细前端页（M508-A，V14，EMR 深化四模块，-detail 避让）
 *
 * 深海蓝VI：AI 缺陷自动分类（文本输入+分类结果+置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Statistic, Tag, Typography, message } from "antd";
import { Input } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ClassifyResult {
  category: string;
  confidence: number;
}

export default function EmrQcAiDefectClassifyDetailPage() {
  const [text, setText] = useState("");
  const [result, setResult] = useState<ClassifyResult | null>(null);
  const [loading, setLoading] = useState(false);

  const doClassify = async () => {
    if (!text.trim()) {
      message.warning("请输入缺陷文本");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-ai-defect-classify-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ text }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
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
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="输入缺陷文本">
          <TextArea
            rows={4}
            placeholder="输入缺陷文本，如：未签名、用药剂量错误、无主诉..."
            value={text}
            onChange={(e) => setText(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doClassify}>
            AI 分类
          </Button>
        </Card>
        {result && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分类结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ marginRight: 16 }}>类别：</Text>
              <Tag color={VI.accent} style={{ fontSize: 14, padding: "4px 12px" }}>{result.category}</Tag>
            </div>
            <Statistic
              title="置信度"
              value={result.confidence}
              suffix="%"
              valueStyle={{ color: result.confidence >= 90 ? "#3f8600" : result.confidence >= 85 ? "#1890ff" : "#faad14" }}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
