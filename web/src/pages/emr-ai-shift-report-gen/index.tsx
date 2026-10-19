/**
 * 健澜科技 jlmedaios - 病历AI病区交班报告生成前端页（M557-D，V14，EMR 深化四模块，M557 收官）
 *
 * 深海蓝VI：病历AI病区交班报告生成（病历ID/科室/病区/在院人数/危重人数/自动生成报告/交班注意事项）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiShiftReportGen {
  recordId: string;
  dept: string;
}

interface GenResult {
  report: string;
  handoverNote: string;
}

interface GenReport {
  report: string;
  handoverNote: string;
}

export default function EmrAiShiftReportGenPage() {
  const [base, setBase] = useState<AiShiftReportGen | null>(null);
  const [ward, setWard] = useState("心内科");
  const [patientCount, setPatientCount] = useState(30);
  const [criticalCount, setCriticalCount] = useState(3);
  const [result, setResult] = useState<GenResult | null>(null);
  const [report, setReport] = useState<GenReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-shift-report-gen", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病区交班报告生成基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGen = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-shift-report-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ ward, patientCount, criticalCount }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("病区交班报告生成完成");
      } else {
        message.error("病区交班报告生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病区交班报告生成</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="生成输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>病区：</Text>
            <Input value={ward} onChange={(e) => setWard(e.target.value)} style={{ width: 140 }} />
            <Text strong>在院人数：</Text>
            <InputNumber min={0} value={patientCount} onChange={(v) => setPatientCount(Number(v ?? 0))} />
            <Text strong>危重人数：</Text>
            <InputNumber min={0} value={criticalCount} onChange={(v) => setCriticalCount(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGen}>
              生成交班报告
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong style={{ fontSize: 14 }}>自动生成报告：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.8 }}>{report.report}</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 14 }}>交班注意事项：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Tag color={report.handoverNote.includes("危重") ? "orange" : "green"} style={{ fontSize: 14 }}>
                    {report.handoverNote}
                  </Tag>
                </Card>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
