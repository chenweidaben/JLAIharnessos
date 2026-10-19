/**
 * 健澜科技 jlmedaios - 病历AI护理风险评估前端页（M557-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI护理风险评估（病历ID/科室/年龄/跌倒史/压疮史/意识模糊/风险等级/风险分）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiNursingRiskAssess {
  recordId: string;
  dept: string;
}

interface AssessResult {
  riskLevel: string;
  riskScore: number;
}

interface AssessReport {
  riskLevel: string;
  riskScore: number;
}

function levelColor(l: string): string {
  if (l === "高风险") return "red";
  if (l === "中风险") return "orange";
  return "green";
}

export default function EmrAiNursingRiskAssessPage() {
  const [base, setBase] = useState<AiNursingRiskAssess | null>(null);
  const [age, setAge] = useState(75);
  const [hasFallHistory, setHasFallHistory] = useState(true);
  const [hasPressureUlcer, setHasPressureUlcer] = useState(true);
  const [isConfused, setIsConfused] = useState(false);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [report, setReport] = useState<AssessReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-nursing-risk-assess", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 护理风险评估基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAssess = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-nursing-risk-assess", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ age, hasFallHistory, hasPressureUlcer, isConfused }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("护理风险评估完成");
      } else {
        message.error("护理风险评估失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const items: Array<{ label: string; value: boolean; set: (v: boolean) => void }> = [
    { label: "跌倒史", value: hasFallHistory, set: setHasFallHistory },
    { label: "压疮史", value: hasPressureUlcer, set: setHasPressureUlcer },
    { label: "意识模糊", value: isConfused, set: setIsConfused },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI护理风险评估</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评估输入">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>年龄：</Text>
            <InputNumber min={0} max={130} value={age} onChange={(v) => setAge(Number(v ?? 0))} />
            {items.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{it.label}：</Text>
                <Switch checked={it.value} onChange={it.set} />
              </div>
            ))}
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAssess}>
              开始风险评估
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评估结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>风险等级：</Text>
                <Tag color={levelColor(report.riskLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.riskLevel}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic title="风险分" value={report.riskScore} suffix="分" valueStyle={{ color: levelColor(report.riskLevel) === "red" ? "red" : VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
