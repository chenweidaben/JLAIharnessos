/**
 * 健澜科技 jlmedaios - 病历AI出院小结自动生成前端页（M555-D，V14，EMR 深化四模块，M555 收官）
 *
 * 深海蓝VI：病历AI出院小结自动生成（病历ID/科室/诊断/手术名称/住院天数/自动生成小结/出院医嘱）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDischargeSummaryGen {
  recordId: string;
  dept: string;
}

interface GenResult {
  summary: string;
  advice: string;
}

interface GenReport {
  summary: string;
  advice: string;
}

export default function EmrAiDischargeSummaryGenPage() {
  const [base, setBase] = useState<AiDischargeSummaryGen | null>(null);
  const [diagnosis, setDiagnosis] = useState("急性阑尾炎");
  const [opName, setOpName] = useState("阑尾切除术");
  const [dischargeDay, setDischargeDay] = useState(7);
  const [result, setResult] = useState<GenResult | null>(null);
  const [report, setReport] = useState<GenReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-discharge-summary-gen", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 出院小结自动生成基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGen = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-discharge-summary-gen", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ diagnosis, opName, dischargeDay }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("出院小结生成完成");
      } else {
        message.error("出院小结生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI出院小结自动生成</Title>
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
            <Text strong>诊断：</Text>
            <Input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} style={{ width: 200 }} />
            <Text strong>手术名称：</Text>
            <Input value={opName} onChange={(e) => setOpName(e.target.value)} style={{ width: 180 }} placeholder="如：阑尾切除术 / 保守治疗" />
            <Text strong>住院天数：</Text>
            <InputNumber min={0} max={120} value={dischargeDay} onChange={(v) => setDischargeDay(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGen}>
              生成出院小结
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="生成结果">
            <Row gutter={24}>
              <Col span={16}>
                <Text strong style={{ fontSize: 14 }}>自动生成小结：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.8 }}>{report.summary}</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 14 }}>出院医嘱：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Tag color="geekblue" style={{ fontSize: 14 }}>{report.advice}</Tag>
                </Card>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
