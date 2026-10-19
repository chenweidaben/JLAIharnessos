/**
 * 健澜科技 jlmedaios - 病历AI院内感染风险预警前端页（M559-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI院内感染风险预警（病历ID/科室/是否手术/是否插管/是否用免疫抑制剂/住院天数/风险分/风险等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiHaiRiskAlert {
  recordId: string;
  dept: string;
}

interface AlertResult {
  riskScore: number;
  riskLevel: string;
}

interface AlertReport {
  riskScore: number;
  riskLevel: string;
}

function levelColor(l: string): string {
  if (l === "高风险") return "red";
  if (l === "中风险") return "orange";
  return "green";
}

export default function EmrAiHaiRiskAlertPage() {
  const [base, setBase] = useState<AiHaiRiskAlert | null>(null);
  const [hasSurgery, setHasSurgery] = useState(true);
  const [hasCatheter, setHasCatheter] = useState(true);
  const [hasImmunosuppressant, setHasImmunosuppressant] = useState(true);
  const [hospitalDays, setHospitalDays] = useState(10);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-hai-risk-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 院内感染风险预警基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAlert = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-hai-risk-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasSurgery, hasCatheter, hasImmunosuppressant, hospitalDays }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("院内感染风险预警完成");
      } else {
        message.error("院内感染风险预警失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const items: Array<{ label: string; value: boolean; set: (v: boolean) => void }> = [
    { label: "是否手术", value: hasSurgery, set: setHasSurgery },
    { label: "是否插管", value: hasCatheter, set: setHasCatheter },
    { label: "免疫抑制剂", value: hasImmunosuppressant, set: setHasImmunosuppressant },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI院内感染风险预警</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="预警输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {items.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{it.label}：</Text>
                <Switch checked={it.value} onChange={it.set} />
              </div>
            ))}
            <Text strong>住院天数：</Text>
            <InputNumber min={0} value={hospitalDays} onChange={(v) => setHospitalDays(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAlert}>
              风险预警
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预警结果">
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
