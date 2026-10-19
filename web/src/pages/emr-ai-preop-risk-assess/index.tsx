/**
 * 健澜科技 jlmedaios - 病历AI术前风险评估前端页（M562-A，V14，EMR 深化四模块，手术与麻醉管理系列）
 *
 * 深海蓝VI：病历AI术前风险评估（病历ID/科室/年龄/心脏病史/高血压史/风险分/风险等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiPreopRiskAssess {
  recordId: string;
  dept: string;
}

interface AssessResult {
  riskScore: number;
  riskLevel: string;
}

interface AssessReport {
  riskScore: number;
  riskLevel: string;
}

function levelColor(l: string): string {
  if (l === "高风险") return "red";
  if (l === "中风险") return "orange";
  return "green";
}

export default function EmrAiPreopRiskAssessPage() {
  const [base, setBase] = useState<AiPreopRiskAssess | null>(null);
  const [patientAge, setPatientAge] = useState(75);
  const [hasHeartDisease, setHasHeartDisease] = useState(true);
  const [hasHypertension, setHasHypertension] = useState(true);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [report, setReport] = useState<AssessReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-preop-risk-assess", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 术前风险评估基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAssess = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-preop-risk-assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patientAge, hasHeartDisease, hasHypertension }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("术前风险评估完成");
      } else {
        message.error("术前风险评估失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const items: Array<{ label: string; value: boolean; set: (v: boolean) => void }> = [
    { label: "心脏病史", value: hasHeartDisease, set: setHasHeartDisease },
    { label: "高血压史", value: hasHypertension, set: setHasHypertension },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI术前风险评估</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评估输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>年龄：</Text>
            <InputNumber min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(Number(v ?? 0))} />
            {items.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{it.label}：</Text>
                <Switch checked={it.value} onChange={it.set} />
              </div>
            ))}
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAssess}>
              风险评估
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评估结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="风险分" value={report.riskScore} suffix="分" />
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>风险等级：</Text>
                <Tag color={levelColor(report.riskLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.riskLevel}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
