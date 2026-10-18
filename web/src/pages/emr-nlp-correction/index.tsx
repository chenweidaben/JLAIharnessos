/**
 * 健澜科技 jlmedaios - NLP 病历纠错前端页（M491-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历原文 TextArea + 纠错建议（红原文/绿正确）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Correction {
  original: string;
  corrected: string;
}

interface NlpCorrectionResult {
  corrections: Correction[];
}

interface NlpCorrectionReport {
  correctionCount: number;
}

export default function EmrNlpCorrectionPage() {
  const [content, setContent] = useState("");
  const [result, setResult] = useState<NlpCorrectionResult | null>(null);
  const [report, setReport] = useState<NlpCorrectionReport | null>(null);

  const correct = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-correction", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ content }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("纠错完成");
      }
    } catch {
      message.error("纠错失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历纠错</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="病历原文">
          <TextArea
            rows={6}
            placeholder="请输入病历原文（如：患者腹泄3天，既往高血亚病史）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={correct} style={{ background: VI.accent }}>
            纠错
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>纠错建议（共 {report?.correctionCount ?? 0} 处）：</Text>
            <br />
            {result.corrections.map((c) => (
              <div key={c.original} style={{ marginTop: 8 }}>
                <Tag color="red">{c.original}</Tag>
                <Text style={{ margin: "0 8px" }}>→</Text>
                <Tag color="green">{c.corrected}</Tag>
              </div>
            ))}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
