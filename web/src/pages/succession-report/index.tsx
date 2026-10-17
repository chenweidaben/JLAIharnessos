/**
 * 健澜科技 jlmedaios - 传承效果度量与院长报告 V13 页（M297-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  overallScore: number;
  riskLevel: "low" | "mid" | "high";
  summary: string;
}

export default function SuccessionReportPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Report>("/api/v1/succession-report?handoverId=pkg-zhang-li");
        if (!cancelled) setReport(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>院长传承报告</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && report && (
          <>
            <Card bordered={false} style={{ background: VI.deep, color: "#fff", marginBottom: 16 }}>
              <Paragraph style={{ color: "#fff", fontSize: 16 }}>{report.summary}</Paragraph>
            </Card>
            <Row gutter={16}>
              <Col span={12}>
                <Card>
                  <Statistic title="总评分" value={report.overallScore} />
                </Card>
              </Col>
              <Col span={12}>
                <Card title="风险评级">
                  <Tag color={report.riskLevel === "low" ? "green" : report.riskLevel === "mid" ? "orange" : "red"}>
                    {report.riskLevel}
                  </Tag>
                </Card>
              </Col>
            </Row>
          </>
        )}
      </Content>
    </Layout>
  );
}
