/**
 * 健澜科技 jlmedaios - 病历AI质控季报生成前端页（M548-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历AI质控季报生成（病历ID/科室/抽查总数/缺陷数/重点关注科室/合格率/评级/报告摘要）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiQcQuarterlyReport {
  recordId: string;
  dept: string;
}

interface QuarterlyResult {
  passRate: number;
  grade: string;
  summary: string;
}

interface QuarterlyReport {
  passRate: number;
  grade: string;
  summary: string;
}

const gradeColor = (grade: string): string => {
  if (grade === "优秀") return "green";
  if (grade === "良好") return "blue";
  return "red";
};

export default function EmrAiQcQuarterlyReportPage() {
  const [base, setBase] = useState<AiQcQuarterlyReport | null>(null);
  const [totalRecords, setTotalRecords] = useState(1500);
  const [defectCount, setDefectCount] = useState(90);
  const [topDept, setTopDept] = useState("普外科");
  const [result, setResult] = useState<QuarterlyResult | null>(null);
  const [report, setReport] = useState<QuarterlyReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-qc-quarterly-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 质控季报基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-qc-quarterly-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ totalRecords, defectCount, topDept }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("季报生成完成");
      } else {
        message.error("季报生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI质控季报生成</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="季报输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>抽查总数：</Text>
              <Input
                type="number"
                value={totalRecords}
                onChange={(e) => setTotalRecords(Number(e.target.value))}
                style={{ width: 120, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>缺陷数：</Text>
              <Input
                type="number"
                value={defectCount}
                onChange={(e) => setDefectCount(Number(e.target.value))}
                style={{ width: 100, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>重点关注科室：</Text>
              <Input value={topDept} onChange={(e) => setTopDept(e.target.value)} style={{ width: 120, marginLeft: 8 }} />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doGenerate}>
            生成质控季报
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="AI 生成季报">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="合格率" value={report.passRate} suffix="%" valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={8}>
                <div>
                  <Text strong style={{ fontSize: 16 }}>评级：</Text>
                  <Tag color={gradeColor(report.grade)} style={{ marginLeft: 8, fontSize: 16 }}>
                    {report.grade}
                  </Tag>
                </div>
              </Col>
              <Col span={8}>
                <Paragraph style={{ fontSize: 14, lineHeight: 1.6 }}>{report.summary}</Paragraph>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
