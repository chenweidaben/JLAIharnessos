/**
 * 健澜科技 jlmedaios - 科室质控月报自动生成前端页（M518-A，V14，EMR 深化四模块，避让 -dept）
 *
 * 深海蓝VI：科室质控月报自动生成（科室/月份/病历总数/缺陷统计/评分等级）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, InputNumber, Layout, Row, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface MonthlyReport {
  dept: string;
  month: string;
  totalRecords: number;
}

interface Defects {
  block: number;
  major: number;
  minor: number;
}

interface ReportResult {
  totalDefects: number;
  score: number;
}

interface ReportSummary {
  score: number;
  grade: string;
}

export default function EmrQcDeptMonthlyReportPage() {
  const [report, setReport] = useState<MonthlyReport | null>(null);
  const [dept, setDept] = useState("心内科");
  const [month, setMonth] = useState("2026-10");
  const [totalRecords, setTotalRecords] = useState(300);
  const [block, setBlock] = useState(1);
  const [major, setMajor] = useState(3);
  const [minor, setMinor] = useState(5);
  const [result, setResult] = useState<ReportResult | null>(null);
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchReport = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-dept-monthly-report", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setReport(data?.data ?? null);
        }
      } catch {
        message.error("加载月报基础数据失败");
      }
    };
    void fetchReport();
  }, []);

  const doGenerate = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-dept-monthly-report", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({
          dept,
          month,
          totalRecords,
          defects: { block, major, minor } as Defects,
        }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setSummary(data?.data?.summary ?? null);
        message.success("月报生成完成");
      } else {
        message.error("生成失败");
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
        <Title level={3} style={{ color: VI.deep }}>科室质控月报自动生成</Title>
        {report && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="月报基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{report.dept}</Text>
              <Text strong>月份：</Text><Text style={{ marginRight: 24 }}>{report.month}</Text>
              <Text strong>病历总数：</Text><Text>{report.totalRecords}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷统计输入">
          <Row gutter={16}>
            <Col span={6}>
              <Text>科室</Text>
              <Input value={dept} onChange={(e) => setDept(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={6}>
              <Text>月份</Text>
              <Input value={month} onChange={(e) => setMonth(e.target.value)} style={{ marginTop: 8 }} />
            </Col>
            <Col span={4}>
              <Text>病历总数</Text>
              <InputNumber value={totalRecords} onChange={(v) => setTotalRecords(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text>阻断</Text>
              <InputNumber value={block} onChange={(v) => setBlock(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text> major</Text>
              <InputNumber value={major} onChange={(v) => setMajor(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
            <Col span={2}>
              <Text>minor</Text>
              <InputNumber value={minor} onChange={(v) => setMinor(Number(v ?? 0))} style={{ width: "100%", marginTop: 8 }} />
            </Col>
          </Row>
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doGenerate}>
            生成月报
          </Button>
        </Card>
        {result && summary && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="月报结果">
            <Row gutter={16}>
              <Col span={8}>
                <Statistic title="总缺陷数" value={result.totalDefects} />
              </Col>
              <Col span={8}>
                <Statistic title="评分" value={result.score} suffix="/ 100" />
              </Col>
              <Col span={8}>
                <Text strong>等级：</Text>
                <Tag
                  color={summary.grade === "优秀" ? "green" : summary.grade === "良好" ? "blue" : summary.grade === "合格" ? "orange" : "red"}
                  style={{ marginLeft: 8, fontSize: 16 }}
                >
                  {summary.grade}
                </Tag>
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
