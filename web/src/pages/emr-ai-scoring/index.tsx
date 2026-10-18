/**
 * 健澜科技 jlmedaios - 病历AI质控评分前端页（M543-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI质控评分（病历ID/科室/阻断项数/主要缺陷数/次要缺陷数/AI评分/AI等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiScoring {
  recordId: string;
  dept: string;
}

interface ScoringResult {
  aiScore: number;
  aiGrade: string;
}

interface ScoringReport {
  aiScore: number;
  aiGrade: string;
}

const gradeColor = (grade: string): string => {
  if (grade === "优秀") return "green";
  if (grade === "良好") return "blue";
  if (grade === "合格") return "orange";
  return "red";
};

export default function EmrAiScoringPage() {
  const [base, setBase] = useState<AiScoring | null>(null);
  const [block, setBlock] = useState(0);
  const [major, setMajor] = useState(0);
  const [minor, setMinor] = useState(1);
  const [result, setResult] = useState<ScoringResult | null>(null);
  const [report, setReport] = useState<ScoringReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-scoring", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 评分基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doScore = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-scoring", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ block, major, minor }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("AI 评分完成");
      } else {
        message.error("AI 评分失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI质控评分</Title>
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
                value={block}
                onChange={(e) => setBlock(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>主要缺陷数：</Text>
              <Input
                type="number"
                value={major}
                onChange={(e) => setMajor(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>次要缺陷数：</Text>
              <Input
                type="number"
                value={minor}
                onChange={(e) => setMinor(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doScore}>
            执行 AI 评分
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="AI 评分" value={report.aiScore} valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={12}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>AI 等级：</Text>
                  <Tag color={gradeColor(report.aiGrade)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.aiGrade}
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
