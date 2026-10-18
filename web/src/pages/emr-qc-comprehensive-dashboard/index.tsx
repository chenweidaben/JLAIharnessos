/**
 * 健澜科技 jlmedaios - 病历质控综合看板（避让版）前端页（M542-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历质控综合看板（科室/月份/总病历数/合格数/缺陷数/合格率/百份缺陷数）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Input, Layout, Row, Statistic, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QcDashboard {
  dept: string;
  month: string;
}

interface DashboardResult {
  passRate: number;
  defectPerRecord: number;
}

interface DashboardReport {
  passRate: number;
  defectPerRecord: number;
}

export default function EmrQcComprehensiveDashboardPage() {
  const [base, setBase] = useState<QcDashboard | null>(null);
  const [totalRecords, setTotalRecords] = useState(500);
  const [qualifiedRecords, setQualifiedRecords] = useState(480);
  const [defectCount, setDefectCount] = useState(25);
  const [result, setResult] = useState<DashboardResult | null>(null);
  const [report, setReport] = useState<DashboardReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-comprehensive-dashboard", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载质控看板基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doLoad = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-comprehensive-dashboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ totalRecords, qualifiedRecords, defectCount }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("看板加载完成");
      } else {
        message.error("看板加载失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历质控综合看板</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{base.dept}</Text>
              <Text strong>月份：</Text><Text>{base.month}</Text>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="看板输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>总病历数：</Text>
              <Input
                type="number"
                value={totalRecords}
                onChange={(e) => setTotalRecords(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>合格数：</Text>
              <Input
                type="number"
                value={qualifiedRecords}
                onChange={(e) => setQualifiedRecords(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>缺陷数：</Text>
              <Input
                type="number"
                value={defectCount}
                onChange={(e) => setDefectCount(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doLoad}>
            加载看板
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="看板结果">
            <Row gutter={24}>
              <Col span={8}>
                <Statistic title="合格率（%）" value={report.passRate} precision={1} suffix="%" valueStyle={{ color: VI.accent }} />
              </Col>
              <Col span={8}>
                <Statistic title="百份缺陷数" value={report.defectPerRecord} precision={1} valueStyle={{ color: "#cf1322" }} />
              </Col>
            </Row>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
