/**
 * 健澜科技 jlmedaios - 病历AI术前评估前端页（M555-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI术前评估（病历ID/科室/患者年龄/心脏病史/糖尿病史/风险等级/能否手术）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiPreopAssessment {
  recordId: string;
  dept: string;
}

interface AssessResult {
  riskLevel: string;
  canOperate: boolean;
}

interface AssessReport {
  riskLevel: string;
  canOperate: boolean;
}

function riskColor(level: string): string {
  if (level === "高危") return "red";
  if (level === "中危") return "orange";
  return "green";
}

export default function EmrAiPreopAssessmentPage() {
  const [base, setBase] = useState<AiPreopAssessment | null>(null);
  const [patientAge, setPatientAge] = useState(45);
  const [hasHeartDisease, setHasHeartDisease] = useState(false);
  const [hasDiabetes, setHasDiabetes] = useState(false);
  const [result, setResult] = useState<AssessResult | null>(null);
  const [report, setReport] = useState<AssessReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-preop-assessment", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 术前评估基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAssess = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-preop-assessment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ patientAge, hasHeartDisease, hasDiabetes }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("术前评估完成");
      } else {
        message.error("术前评估失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI术前评估</Title>
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
            <Text strong>患者年龄：</Text>
            <InputNumber min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(Number(v ?? 0))} />
            <Text strong>心脏病史：</Text>
            <Switch checked={hasHeartDisease} onChange={setHasHeartDisease} />
            <Text strong>糖尿病史：</Text>
            <Switch checked={hasDiabetes} onChange={setHasDiabetes} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAssess}>
              开始术前评估
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评估结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>风险等级：</Text>
                <Tag color={riskColor(report.riskLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.riskLevel}
                </Tag>
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>能否手术：</Text>
                <Tag color={report.canOperate ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.canOperate ? "可以手术" : "不建议手术"}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
