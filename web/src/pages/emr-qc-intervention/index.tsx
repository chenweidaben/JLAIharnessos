/**
 * 健澜科技 jlmedaios - 质控干预建议生成前端页（M495-D，M495 收官，V14，EMR 深化四模块）
 *
 * 深海蓝VI：干预建议列表（风险等级 Select + 建议 Card）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Select, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Intervention {
  level: string;
  suggestion: string;
  action: string;
}

interface InterventionReport {
  level: string;
  suggestion: string;
  action: string;
}

const levelColor: Record<string, string> = {
  低风险: "green",
  中风险: "gold",
  高风险: "red",
};

export default function EmrQcInterventionPage() {
  const [level, setLevel] = useState("中风险");
  const [intervention, setIntervention] = useState<Intervention | null>(null);
  const [report, setReport] = useState<InterventionReport | null>(null);

  const generate = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-intervention", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ level }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setIntervention(data?.data?.intervention ?? null);
        setReport(data?.data?.report ?? null);
        message.success("干预建议生成完成");
      }
    } catch {
      message.error("干预建议生成失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控干预建议生成</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="选择风险等级">
          <Select
            value={level}
            style={{ width: 200 }}
            onChange={(v) => setLevel(v)}
            options={[
              { value: "低风险", label: "低风险" },
              { value: "中风险", label: "中风险" },
              { value: "高风险", label: "高风险" },
            ]}
          />
          <Button type="primary" onClick={generate} style={{ background: VI.accent, marginLeft: 16 }}>
            生成建议
          </Button>
        </Card>
        {report && (
          <Card style={{ marginTop: 16 }}>
            <Text strong>风险等级：</Text>
            <Tag color={levelColor[report.level] ?? "default"}>{report.level}</Tag>
            <Title level={5} style={{ marginTop: 16 }}>建议：{report.suggestion}</Title>
            <Text>行动：{report.action}</Text>
            {intervention && (
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">详细建议已生成</Text>
              </div>
            )}
          </Card>
        )}
      </Content>
    </Layout>
  );
}
