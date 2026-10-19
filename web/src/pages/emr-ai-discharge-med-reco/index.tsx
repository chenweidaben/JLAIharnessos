/**
 * 健澜科技 jlmedaios - 病历AI出院带药建议前端页（M558-D，V14，EMR 深化四模块，M558 收官）
 *
 * 深海蓝VI：病历AI出院带药建议（病历ID/科室/诊断/年龄/推荐药品/剂量/天数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDischargeMedReco {
  recordId: string;
  dept: string;
}

interface RecoResult {
  medName: string;
  dosage: string;
  days: number;
}

interface RecoReport {
  medName: string;
  dosage: string;
  days: number;
}

export default function EmrAiDischargeMedRecoPage() {
  const [base, setBase] = useState<AiDischargeMedReco | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性心梗");
  const [patientAge, setPatientAge] = useState(78);
  const [result, setResult] = useState<RecoResult | null>(null);
  const [report, setReport] = useState<RecoReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-discharge-med-reco", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 出院带药建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReco = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-discharge-med-reco", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, patientAge }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("出院带药建议生成完成");
      } else {
        message.error("出院带药建议生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI出院带药建议</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="建议输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200 }} />
            <Text strong>年龄：</Text>
            <InputNumber min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReco}>
              生成带药建议
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="建议结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>推荐药品：</Text>
                <Tag color="geekblue" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.medName}
                </Tag>
              </Col>
              <Col span={6}>
                <Text strong style={{ fontSize: 16 }}>剂量：</Text>
                <Tag color="purple" style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.dosage}
                </Tag>
              </Col>
              <Col span={6}>
                <Statistic title="天数" value={report.days} suffix="天" />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
