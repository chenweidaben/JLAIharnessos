/**
 * 健澜科技 jlmedaios - AI病历缺陷根因分析前端页（M522-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：AI病历缺陷根因分析（缺陷ID/缺陷类型/发生频次/严重级别/根因结论/置信度）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, InputNumber, Layout, Row, Select, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiDefectRootCause {
  defectId: string;
  defectType: string;
}

interface RootCauseResult {
  rootCause: string;
  confidence: number;
}

interface RootCauseReport {
  rootCause: string;
  confidence: number;
}

export default function EmrAiDefectRootCausePage() {
  const [rootCause, setRootCause] = useState<AiDefectRootCause | null>(null);
  const [freq, setFreq] = useState(15);
  const [severity, setSeverity] = useState("major");
  const [result, setResult] = useState<RootCauseResult | null>(null);
  const [report, setReport] = useState<RootCauseReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchRootCause = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-defect-root-cause", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRootCause(data?.data ?? null);
        }
      } catch {
        message.error("加载根因分析基础数据失败");
      }
    };
    void fetchRootCause();
  }, []);

  const doAnalyze = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-defect-root-cause", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ freq, severity }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("分析完成");
      } else {
        message.error("分析失败");
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
        <Title level={3} style={{ color: VI.deep }}>AI病历缺陷根因分析</Title>
        {rootCause && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="根因分析基础数据">
            <div>
              <Text strong>缺陷ID：</Text><Text style={{ marginRight: 24 }}>{rootCause.defectId}</Text>
              <Text strong>缺陷类型：</Text>
              <Tag color={VI.accent} style={{ marginLeft: 8 }}>{rootCause.defectType}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="分析输入">
          <Row gutter={16}>
            <Col span={12}>
              <Text>发生频次</Text>
              <InputNumber min={0} value={freq} onChange={(v) => setFreq(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={12}>
              <Text>严重级别</Text>
              <Select
                value={severity}
                onChange={(v) => setSeverity(v)}
                style={{ width: "100%", marginTop: 8 }}
                options={[
                  { value: "block", label: "阻断" },
                  { value: "major", label: "严重" },
                  { value: "minor", label: "一般" },
                ]}
              />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doAnalyze}>
            AI根因分析
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分析结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <div>
                <Text strong>根因结论：</Text>
                <Tag
                  color={report.rootCause === "系统流程缺陷" ? "red" : report.rootCause === "操作习惯问题" ? "orange" : "blue"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {report.rootCause}
                </Tag>
              </div>
              <Statistic title="置信度" value={report.confidence} precision={2} />
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
