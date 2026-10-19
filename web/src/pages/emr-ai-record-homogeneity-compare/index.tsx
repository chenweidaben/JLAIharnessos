/**
 * 健澜科技 jlmedaios - 病历AI病历同质化对比前端页（M553-D，V14，EMR 深化四模块，M553 收官）
 *
 * 深海蓝VI：病历AI病历同质化对比（病历ID/科室/A科室病历数/B科室病历数/A科室平均字数/B科室平均字数/相似度%/同质化等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AiRecordHomogeneityCompare {
  recordId: string;
  dept: string;
}

interface CompareResult {
  similarityPct: number;
  level: string;
}

interface CompareReport {
  similarityPct: number;
  level: string;
}

const levelColor = (level: string): string => {
  if (level === "高度同质") return "green";
  if (level === "基本同质") return "orange";
  return "red";
};

export default function EmrAiRecordHomogeneityComparePage() {
  const [base, setBase] = useState<AiRecordHomogeneityCompare | null>(null);
  const [deptARecords, setDeptARecords] = useState(100);
  const [deptBRecords, setDeptBRecords] = useState(80);
  const [avgLengthA, setAvgLengthA] = useState(500);
  const [avgLengthB, setAvgLengthB] = useState(520);
  const [result, setResult] = useState<CompareResult | null>(null);
  const [report, setReport] = useState<CompareReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-ai-record-homogeneity-compare", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载 AI 病历同质化对比基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doCompare = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-ai-record-homogeneity-compare", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ deptARecords, deptBRecords, avgLengthA, avgLengthB }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("同质化对比完成");
      } else {
        message.error("同质化对比失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历AI病历同质化对比</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>病历ID：</Text><Text style={{ marginRight: 24 }}>{base.recordId}</Text>
              <Text strong>科室：</Text><Tag color="blue">{base.dept}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="对比输入">
          <Row gutter={[16, 16]}>
            <Col span={6}>
              <Text strong>A科室病历数：</Text>
              <Input type="number" value={deptARecords} onChange={(e) => setDeptARecords(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} />
            </Col>
            <Col span={6}>
              <Text strong>B科室病历数：</Text>
              <Input type="number" value={deptBRecords} onChange={(e) => setDeptBRecords(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} />
            </Col>
            <Col span={6}>
              <Text strong>A科室平均字数：</Text>
              <Input type="number" value={avgLengthA} onChange={(e) => setAvgLengthA(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} />
            </Col>
            <Col span={6}>
              <Text strong>B科室平均字数：</Text>
              <Input type="number" value={avgLengthB} onChange={(e) => setAvgLengthB(Number(e.target.value))} style={{ width: "100%", marginTop: 4 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doCompare}>
            对比同质化程度
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="对比结果">
            <Row gutter={24}>
              <Col span={12}>
                <Statistic title="相似度(%)" value={report.similarityPct} precision={1} valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={12}>
                <Text strong style={{ fontSize: 16 }}>同质化等级：</Text>
                <Tag color={levelColor(report.level)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.level}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
