/**
 * 健澜科技 jlmedaios - NLP 病历相似度计算前端页（M491-D，M491 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：两份病历 TextArea + 相似度评分（进度条）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Progress, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const { TextArea } = Input;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface NlpSimilarityResult {
  similarityScore: number;
}

interface NlpSimilarityReport {
  similarityScore: number;
}

export default function EmrNlpSimilarityPage() {
  const [textA, setTextA] = useState("");
  const [textB, setTextB] = useState("");
  const [result, setResult] = useState<NlpSimilarityResult | null>(null);
  const [report, setReport] = useState<NlpSimilarityReport | null>(null);

  const calculate = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-nlp-similarity", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ textA, textB }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("相似度计算完成");
      }
    } catch {
      message.error("相似度计算失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>NLP 病历相似度计算</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="两份病历">
          <TextArea
            rows={4}
            placeholder="病历A（如：糖尿病高血压病史5年）"
            value={textA}
            onChange={(e) => setTextA(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <TextArea
            rows={4}
            placeholder="病历B（如：糖尿病3年，口服二甲双胍）"
            value={textB}
            onChange={(e) => setTextB(e.target.value)}
            style={{ marginBottom: 16 }}
          />
          <Button type="primary" onClick={calculate} style={{ background: VI.accent }}>
            计算相似度
          </Button>
        </Card>
        {result && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>相似度评分：{report?.similarityScore ?? 0} / 100</Text>
            <Progress
              percent={report?.similarityScore ?? 0}
              strokeColor={{ from: VI.accent, to: VI.mid }}
              style={{ marginTop: 16 }}
            />
          </Card>
        )}
      </Content>
    </Layout>
  );
}
