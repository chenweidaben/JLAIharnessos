/**
 * 健澜科技 jlmedaios - 病历AI病案利用分析前端页（M556-D，V14，EMR 深化四模块，M556 收官）
 *
 * 深海蓝VI：病历AI病案利用分析（病历ID/科室/总病历数/借阅数/调阅数/借阅率%/调阅率%/利用级别）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRecordUtilizationAnalysis {
  recordId: string;
  dept: string;
}

interface AnalysisResult {
  borrowRate: number;
  referRate: number;
  utilizationLevel: string;
}

interface AnalysisReport {
  borrowRate: number;
  referRate: number;
  utilizationLevel: string;
}

function levelColor(l: string): string {
  if (l === "高利用") return "green";
  if (l === "中利用") return "orange";
  return "default";
}

export default function EmrAiRecordUtilizationAnalysisPage() {
  const [base, setBase] = useState<AiRecordUtilizationAnalysis | null>(null);
  const [totalRecords, setTotalRecords] = useState(1000);
  const [borrowedRecords, setBorrowedRecords] = useState(200);
  const [referencedRecords, setReferencedRecords] = useState(150);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [report, setReport] = useState<AnalysisReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-record-utilization-analysis", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病案利用分析基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-record-utilization-analysis", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ totalRecords, borrowedRecords, referencedRecords }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("病案利用分析完成");
      } else {
        message.error("病案利用分析失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病案利用分析</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="分析输入">
          <div style={{ display: "flex", gap: 24, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
            <Text strong>总病历数：</Text>
            <InputNumber min={0} value={totalRecords} onChange={(v) => setTotalRecords(Number(v ?? 0))} />
            <Text strong>借阅数：</Text>
            <InputNumber min={0} value={borrowedRecords} onChange={(v) => setBorrowedRecords(Number(v ?? 0))} />
            <Text strong>调阅数：</Text>
            <InputNumber min={0} value={referencedRecords} onChange={(v) => setReferencedRecords(Number(v ?? 0))} />
            <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doAnalyze}>
              开始利用分析
            </Button>
          </div>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分析结果">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="借阅率" value={report.borrowRate} suffix="%" precision={1} valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={8}>
                <Statistic title="调阅率" value={report.referRate} suffix="%" precision={1} valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={8}>
                <Text strong style={{ fontSize: 16 }}>利用级别：</Text>
                <Tag color={levelColor(report.utilizationLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.utilizationLevel}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
