/**
 * 健澜科技 jlmedaios - 病历AI病案缺陷预警前端页（M556-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI病案缺陷预警（病历ID/科室/缺诊断/缺术者/缺手术日期/缺出院原因/预警级别/缺陷数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Statistic, Switch, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRecordDefectAlert {
  recordId: string;
  dept: string;
}

interface AlertResult {
  alertLevel: string;
  defectCount: number;
}

interface AlertReport {
  alertLevel: string;
  defectCount: number;
}

function levelColor(l: string): string {
  if (l === "红色预警") return "red";
  if (l === "黄色预警") return "orange";
  return "green";
}

export default function EmrAiRecordDefectAlertPage() {
  const [base, setBase] = useState<AiRecordDefectAlert | null>(null);
  const [hasMissingDiagnosis, setHasMissingDiagnosis] = useState(false);
  const [hasMissingSurgeon, setHasMissingSurgeon] = useState(false);
  const [hasMissingOpDate, setHasMissingOpDate] = useState(false);
  const [hasMissingDischargeReason, setHasMissingDischargeReason] = useState(false);
  const [result, setResult] = useState<AlertResult | null>(null);
  const [report, setReport] = useState<AlertReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-record-defect-alert", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病案缺陷预警基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAlert = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-record-defect-alert", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ hasMissingDiagnosis, hasMissingSurgeon, hasMissingOpDate, hasMissingDischargeReason }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("病案缺陷预警完成");
      } else {
        message.error("病案缺陷预警失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  const items: Array<{ label: string; value: boolean; set: (v: boolean) => void }> = [
    { label: "缺诊断", value: hasMissingDiagnosis, set: setHasMissingDiagnosis },
    { label: "缺术者", value: hasMissingSurgeon, set: setHasMissingSurgeon },
    { label: "缺手术日期", value: hasMissingOpDate, set: setHasMissingOpDate },
    { label: "缺出院原因", value: hasMissingDischargeReason, set: setHasMissingDischargeReason },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历AI病案缺陷预警</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷输入（开启=该项缺失）">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            {items.map((it) => (
              <div key={it.label} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Text strong>{it.label}：</Text>
                <Switch checked={it.value} onChange={it.set} />
              </div>
            ))}
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAlert}>
              开始缺陷预警
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预警结果">
            <Row gutter={24}>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>预警级别：</Text>
                <Tag color={levelColor(report.alertLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.alertLevel}
                </Tag>
              </Col>
              <Col span={12}>
                <Statistic title="缺陷数" value={report.defectCount} suffix="项" valueStyle={{ color: levelColor(report.alertLevel) === "red" ? "red" : VI.accent }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
