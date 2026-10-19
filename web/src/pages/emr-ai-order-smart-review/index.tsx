/**
 * 健澜科技 jlmedaios - 病历AI医嘱智能审核前端页（M558-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI医嘱智能审核（病历ID/科室/药品名称/剂量/年龄/是否合理/审核建议）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiOrderSmartReview {
  recordId: string;
  dept: string;
}

interface ReviewResult {
  isAppropriate: boolean;
  advice: string;
}

interface ReviewReport {
  isAppropriate: boolean;
  advice: string;
}

export default function EmrAiOrderSmartReviewPage() {
  const [base, setBase] = useState<AiOrderSmartReview | null>(null);
  const [drugName, setDrugName] = useState("布洛芬");
  const [dosage, setDosage] = useState("常规剂量");
  const [patientAge, setPatientAge] = useState(45);
  const [result, setResult] = useState<ReviewResult | null>(null);
  const [report, setReport] = useState<ReviewReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-order-smart-review", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 医嘱智能审核基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doReview = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-order-smart-review", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ drugName, dosage, patientAge }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("医嘱智能审核完成");
      } else {
        message.error("医嘱智能审核失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI医嘱智能审核</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="审核输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>药品名称：</Text>
            <Input value={drugName} onChange={(e) => setDrugName(e.target.value)} style={{ width: 180 }} />
            <Text strong>剂量：</Text>
            <Input value={dosage} onChange={(e) => setDosage(e.target.value)} style={{ width: 140 }} />
            <Text strong>年龄：</Text>
            <InputNumber min={0} max={130} value={patientAge} onChange={(v) => setPatientAge(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doReview}>
              智能审核
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="审核结果">
            <Row gutter={24}>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>是否合理：</Text>
                <Tag color={report.isAppropriate ? "green" : "red"} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.isAppropriate ? "合理" : "不合理"}
                </Tag>
              </Col>
              <Col span={16}>
                <Text strong style={{ fontSize: 16 }}>审核建议：</Text>
                <Card type="inner" size="small" style={{ marginTop: 8, background: "#fff" }}>
                  <Text style={{ fontSize: 14, lineHeight: 1.8 }}>{report.advice}</Text>
                </Card>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
