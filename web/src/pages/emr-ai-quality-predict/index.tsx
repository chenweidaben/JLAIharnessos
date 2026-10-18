/**
 * 健澜科技 jlmedaios - AI病历质量预测前端页（M522-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI病历质量预测（记录ID/病历类型/完整性/及时性/准确性/预测分/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiQualityPredict {
  recordId: string;
  recordType: string;
}

interface PredictResult {
  score: number;
  grade: string;
}

interface PredictReport {
  score: number;
  grade: string;
}

export default function EmrAiQualityPredictPage() {
  const [predict, setPredict] = useState<AiQualityPredict | null>(null);
  const [completeness, setCompleteness] = useState(90);
  const [timeliness, setTimeliness] = useState(85);
  const [accuracy, setAccuracy] = useState(92);
  const [result, setResult] = useState<PredictResult | null>(null);
  const [report, setReport] = useState<PredictReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchPredict = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-quality-predict", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setPredict(data?.data ?? null);
        }
      } catch {
        message.error("加载质量预测基础数据失败");
      }
    };
    void fetchPredict();
  }, []);

  const doPredict = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-quality-predict", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ completeness, timeliness, accuracy }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("预测完成");
      } else {
        message.error("预测失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI病历质量预测</Title>
        {predict && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="质量预测基础数据">
            <div>
              <Text strong>记录ID：</Text><Text style={{ marginRight: 24 }}>{predict.recordId}</Text>
              <Text strong>病历类型：</Text><Text>{predict.recordType}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="三维度评分输入">
          <Row gutter={16}>
            <Col span={8}>
              <Text>完整性 (0-100)</Text>
              <InputNumber min={0} max={100} value={completeness} onChange={(v) => setCompleteness(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <Text>及时性 (0-100)</Text>
              <InputNumber min={0} max={100} value={timeliness} onChange={(v) => setTimeliness(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={8}>
              <Text>准确性 (0-100)</Text>
              <InputNumber min={0} max={100} value={accuracy} onChange={(v) => setAccuracy(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doPredict}>
            AI预测质量分
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="预测结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="预测质量分" value={report.score} precision={1} />
              <div>
                <Text strong>等级：</Text>
                <Tag
                  color={report.grade === "优" ? "green" : report.grade === "良" ? "blue" : report.grade === "中" ? "orange" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.grade}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
