/**
 * 健澜科技 jlmedaios - 病历AI药品相互作用明细审查前端页（M565-C，V14，EMR 深化四模块，-detail 后缀避让 emrAiDrugInteractionV14）
 *
 * 深海蓝VI：病历AI药品相互作用明细审查（病历ID/科室/药品A/药品B/相互作用级别/处理建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Input, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDrugInteractionDetail {
  recordId: string;
  dept: string;
}

interface DetailResult {
  level: string;
  suggestion: string;
}

interface DetailReport {
  level: string;
  suggestion: string;
}

export default function EmrAiDrugInteractionDetailPage() {
  const [base, setBase] = useState<AiDrugInteractionDetail | null>(null);
  const [drugA, setDrugA] = useState("华法林钠片");
  const [drugB, setDrugB] = useState("阿司匹林肠溶片");
  const [result, setResult] = useState<DetailResult | null>(null);
  const [report, setReport] = useState<DetailReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-drug-interaction-detail", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 药品相互作用明细审查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doDetail = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-drug-interaction-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ drugA, drugB }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("药品相互作用明细审查完成");
      } else {
        message.error("药品相互作用明细审查失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const levelColor = (level: string) => (level === "严重" ? "red" : level === "中度" ? "orange" : "green");

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI药品相互作用明细审查</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审查输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>药品A：</Text>
            <Input value={drugA} onChange={(e) => setDrugA(e.target.value)} style={{ width: 200 }} />
            <Text strong>药品B：</Text>
            <Input value={drugB} onChange={(e) => setDrugB(e.target.value)} style={{ width: 200 }} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doDetail}>
              开始审查
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审查结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong style={{ fontSize: 16 }}>相互作用级别：</Text>
              <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                {report.level}
              </Tag>
            </div>
            <div>
              <Text strong style={{ fontSize: 16 }}>处理建议：</Text>
              <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                {report.suggestion}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
