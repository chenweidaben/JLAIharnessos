/**
 * 健澜科技 jlmedaios - 病历AI质控风险评分前端页（M549-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI质控风险评分（病历ID/科室/阻断项数/主要缺陷数/次要缺陷数/风险评分/风险等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiQcRiskScore {
  recordId: string;
  dept: string;
}

interface RiskResult {
  riskScore: number;
  riskLevel: string;
}

interface RiskReport {
  riskScore: number;
  riskLevel: string;
}

const levelColor = (level: string): string => {
  if (level === "高风险") return "red";
  if (level === "中风险") return "orange";
  return "green";
};

export default function EmrAiQcRiskScorePage() {
  const [base, setBase] = useState<AiQcRiskScore | null>(null);
  const [blockCount, setBlockCount] = useState(2);
  const [majorCount, setMajorCount] = useState(3);
  const [minorCount, setMinorCount] = useState(5);
  const [result, setResult] = useState<RiskResult | null>(null);
  const [report, setReport] = useState<RiskReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-qc-risk-score", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 风险评分基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doScore = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-qc-risk-score", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ blockCount, majorCount, minorCount }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("风险评分完成");
      } else {
        message.error("风险评分失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI质控风险评分</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="评分输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>阻断项数：</Text>
              <Input
                type="number"
                value={blockCount}
                onChange={(e) => setBlockCount(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>主要缺陷数：</Text>
              <Input
                type="number"
                value={majorCount}
                onChange={(e) => setMajorCount(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>次要缺陷数：</Text>
              <Input
                type="number"
                value={minorCount}
                onChange={(e) => setMinorCount(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doScore}>
            计算风险评分
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="风险评分结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="风险评分" value={report.riskScore} suffix="/100" valueStyle={{ color: report.riskScore >= 60 ? "#cf1322" : VI.accent }} />
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>风险等级：</Text>
                  <Tag color={levelColor(report.riskLevel)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.riskLevel}
                  </Tag>
                </div>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
