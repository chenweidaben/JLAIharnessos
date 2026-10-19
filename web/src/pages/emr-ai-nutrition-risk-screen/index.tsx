/**
 * 健澜科技 jlmedaios - 病历AI营养风险筛查前端页（M564-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI营养风险筛查（病历ID/科室/BMI/体重下降%/进食减少%/风险分/风险等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiNutritionRiskScreen {
  recordId: string;
  dept: string;
}

interface ScreenResult {
  riskScore: number;
  riskLevel: string;
}

interface ScreenReport {
  riskScore: number;
  riskLevel: string;
}

function levelColor(l: string): string {
  if (l === "高风险") return "red";
  if (l === "中风险") return "orange";
  return "green";
}

export default function EmrAiNutritionRiskScreenPage() {
  const [base, setBase] = useState<AiNutritionRiskScreen | null>(null);
  const [bmi, setBmi] = useState(17.0);
  const [weightLoss, setWeightLoss] = useState(8);
  const [intakeReduced, setIntakeReduced] = useState(60);
  const [result, setResult] = useState<ScreenResult | null>(null);
  const [report, setReport] = useState<ScreenReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-nutrition-risk-screen", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 营养风险筛查基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doScreen = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-nutrition-risk-screen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ bmi, weightLoss, intakeReduced }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("营养风险筛查完成");
      } else {
        message.error("营养风险筛查失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI营养风险筛查</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="筛查输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>BMI：</Text>
            <InputNumber min={10} max={40} step={0.1} value={bmi} onChange={(v) => setBmi(Number(v ?? 0))} />
            <Text strong>体重下降%：</Text>
            <InputNumber min={0} max={30} value={weightLoss} onChange={(v) => setWeightLoss(Number(v ?? 0))} />
            <Text strong>进食减少%：</Text>
            <InputNumber min={0} max={100} value={intakeReduced} onChange={(v) => setIntakeReduced(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doScreen}>
              风险筛查
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="筛查结果">
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
