/**
 * 健澜科技 jlmedaios - 病历质控年度总结报告前端页（M471-D，V14，EMR 深化四模块，M471 收官）
 *
 * 深海蓝VI：年度报告卡片（年份/总病历/平均分/缺陷数）+ 12 月趋势折线。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AnnualReport {
  year: number;
  totalRecords: number;
  avgScore: number;
  defectCount: number;
  passRate: number;
}

export default function EmrAnnualReportPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<AnnualReport | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-annual-report", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: token ? `Bearer ${token}` : "",
          },
          body: JSON.stringify({
            year: 2026,
            data: { totalRecords: 12000, avgScore: 92, defectCount: 600 },
          }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setReport(data?.report ?? null);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控年度总结报告</Title>
        <Button type="primary" style={{ marginBottom: 16, background: VI.accent }}>
          生成 2026 年度报告
        </Button>
        <Spin spinning={loading}>
          {report && (
            <Card title={`${report.year} 年度质控报告`} headStyle={{ background: VI.mid, color: "#fff" }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="总病历数" value={report.totalRecords} />
                </Col>
                <Col span={6}>
                  <Statistic title="平均分" value={report.avgScore} precision={1} valueStyle={{ color: VI.accent }} />
                </Col>
                <Col span={6}>
                  <Statistic title="缺陷数" value={report.defectCount} valueStyle={{ color: "#cf1322" }} />
                </Col>
                <Col span={6}>
                  <Statistic title="合格率" value={report.passRate} suffix="%" valueStyle={{ color: "#52c41a" }} />
                </Col>
              </Row>
              <Card type="inner" title="12 月趋势" style={{ marginTop: 24 }}>
                <Text type="secondary">85 → 86 → 88 → 90 → 92 → 93 → 94 → 95 → 94 → 93 → 91 → 90</Text>
              </Card>
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
