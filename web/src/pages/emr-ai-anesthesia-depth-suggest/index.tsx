/**
 * 健澜科技 jlmedaios - 病历AI麻醉深度监测建议前端页（M562-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI麻醉深度监测建议（病历ID/科室/手术类型/年龄/BIS目标值/监测建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiAnesthesiaDepthSuggest {
  recordId: string;
  dept: string;
}

interface SuggestResult {
  bisTarget: number;
  monitoringAdvice: string;
}

interface SuggestReport {
  bisTarget: number;
  monitoringAdvice: string;
}

export default function EmrAiAnesthesiaDepthSuggestPage() {
  const [base, setBase] = useState<AiAnesthesiaDepthSuggest | null>(null);
  const [surgeryType, setSurgeryType] = useState("心脏搭桥手术");
  const [patientAge, setPatientAge] = useState(60);
  const [result, setResult] = useState<SuggestResult | null>(null);
  const [report, setReport] = useState<SuggestReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-anesthesia-depth-suggest", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 麻醉深度监测建议基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doSuggest = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-anesthesia-depth-suggest", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ surgeryType, patientAge }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("麻醉深度监测建议完成");
      } else {
        message.error("麻醉深度监测建议失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI麻醉深度监测建议</Title>
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
            <Text strong>手术类型：</Text>
            <Input value={surgeryType} onChange={(e) => setSurgeryType(e.target.value)} style={{ width: 200 }} />
            <Text strong>年龄：</Text>
            <InputNumber min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doSuggest}>
              生成建议
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="建议结果">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="BIS目标值" value={report.bisTarget} />
              </Col>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>监测建议：</Text>
                <Tag color={report.monitoringAdvice.includes("老年") ? "orange" : "blue"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.monitoringAdvice}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
