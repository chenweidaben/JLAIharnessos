/**
 * 健澜科技 jlmedaios - 病历AI病案质量评分前端页（M556-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI病案质量评分（病历ID/科室/完整度%/准确率%/及时率%/总分/等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRecordQualityScore {
  recordId: string;
  dept: string;
}

interface ScoreResult {
  totalScore: number;
  grade: string;
}

interface ScoreReport {
  totalScore: number;
  grade: string;
}

function gradeColor(g: string): string {
  if (g === "优秀") return "green";
  if (g === "良好") return "blue";
  if (g === "合格") return "orange";
  return "red";
}

export default function EmrAiRecordQualityScorePage() {
  const [base, setBase] = useState<AiRecordQualityScore | null>(null);
  const [completeness, setCompleteness] = useState(95);
  const [accuracy, setAccuracy] = useState(90);
  const [timeliness, setTimeliness] = useState(85);
  const [result, setResult] = useState<ScoreResult | null>(null);
  const [report, setReport] = useState<ScoreReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-record-quality-score", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病案质量评分基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doScore = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-record-quality-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ completeness, accuracy, timeliness }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("病案质量评分完成");
      } else {
        message.error("病案质量评分失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病案质量评分</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评分输入">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>完整度%：</Text>
            <InputNumber min={0} max={100} value={completeness} onChange={(v) => setCompleteness(Number(v ?? 0))} />
            <Text strong>准确率%：</Text>
            <InputNumber min={0} max={100} value={accuracy} onChange={(v) => setAccuracy(Number(v ?? 0))} />
            <Text strong>及时率%：</Text>
            <InputNumber min={0} max={100} value={timeliness} onChange={(v) => setTimeliness(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doScore}>
              开始评分
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="总分" value={report.totalScore} suffix="分" valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>等级：</Text>
                <Tag color={gradeColor(report.grade)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.grade}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
