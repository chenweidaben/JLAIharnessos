/**
 * 健澜科技 jlmedaios - NLP 病历标准化前端页（M491-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历原文 TextArea + 标准化结果（红原文/绿标准术语）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Normalization {
  original: string;
  normalized: string;
}

interface NlpNormalizationResult {
  normalizations: Normalization[];
}

interface NlpNormalizationReport {
  normalizationCount: number;
}

export default function EmrNlpNormalizationPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<NlpNormalizationResult | null>(null);
  const [report, setReport] = useState<NlpNormalizationReport | null>(null);

  const normalize = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-normalization", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("标准化完成");
      }
    } catch {
      message.error("标准化失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历标准化</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="病历原文">
          <TextArea
            rows={6}
            placeholder="请输入病历原文（如：患者拉肚子3天，伴发烧）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={normalize} style={{ background: VI.accent }}>
            标准化
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>标准化建议（共 {report?.normalizationCount ?? 0} 处）：</Text>
            <br />
            {result.normalizations.map((n) => (
              <div key={n.original} style={{ marginTop: 8 }}>
                <Tag color="red">{n.original}</Tag>
                <Text style={{ margin: "0 8px" }}>→</Text>
                <Tag color="green">{n.normalized}</Tag>
              </div>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
