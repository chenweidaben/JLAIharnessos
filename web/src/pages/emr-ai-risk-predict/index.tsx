/**
 * 健澜科技 jlmedaios - AI 病历风险预测前端页（M486-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：风险因素输入（年龄+疾病+症状）+ 风险等级展示（绿低/黄中/红高）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRiskResult {
  age: number;
  diseases: string[];
  symptoms: string[];
  riskLevel: "低" | "中" | "高";
}

interface AiRiskReport {
  riskLevel: "低" | "中" | "高";
  riskScore: number;
}

export default function EmrAiRiskPredictPage() {
  const [age, setAge] = useState("30");
  const [diseases, setDiseases] = useState("");
  const [symptoms, setSymptoms] = useState("头痛");
  const [result, setResult] = useState<AiRiskResult | null>(null);
  const [report, setReport] = useState<AiRiskReport | null>(null);

  const predict = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-risk-predict", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({
          age: Number(age),
          diseases: diseases ? diseases.split(",").map((s) => s.trim()) : [],
          symptoms: symptoms ? symptoms.split(",").map((s) => s.trim()) : [],
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.result ?? null);
        setReport(data?.report ?? null);
        message.success("预测完成");
      }
    } catch {
      message.error("预测失败");
    }
  };

  const tagColor = report?.riskLevel === "高" ? "red" : report?.riskLevel === "中" ? "orange" : "green";

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>AI 病历风险预测</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }}>
          <Input placeholder="年龄" value={age} onChange={(e) => setAge(e.target.value)} style={{ marginBottom: 16 }} />
          <Input placeholder="疾病（逗号分隔）" value={diseases} onChange={(e) => setDiseases(e.target.value)} style={{ marginBottom: 16 }} />
          <Input placeholder="症状（逗号分隔）" value={symptoms} onChange={(e) => setSymptoms(e.target.value)} style={{ marginBottom: 16 }} />
          <Button type="primary" onClick={predict} style={{ background: VI.accent }}>
            预测
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Statistic title="风险等级" value={report.riskLevel} />
            <Statistic title="风险评分" value={report.riskScore} style={{ marginTop: 12 }} />
            <Tag color={tagColor} style={{ marginTop: 16 }}>{report.riskLevel}风险</Tag>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
