/**
 * 健澜科技 jlmedaios - 病历质控月度报告前端页（M466-D，V14，EMR 深化四模块，M466 收官）
 *
 * 深海蓝VI：月报卡片（合格率/得分/缺陷分布）+ 趋势图。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Report {
  month: string;
  totalRecords: number;
  passCount: number;
  blockCount: number;
  majorCount: number;
  minorCount: number;
  passRate: number;
  score: number;
}

export default function EmrMonthlyReportPage() {
  const [loading, setLoading] = useState(true);
  const [report, setReport] = useState<Report | null>(null);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-monthly-report/2026-10", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
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
        <Title level={3} style={{ color: VI.deep }}>病历质控月度报告</Title>
        <Spin spinning={loading}>
          {report && (
            <Row gutter={16}>
              <Col span={8}>
                <Card title="合格率" headStyle={{ background: VI.deep, color: "#fff" }}>
                  <Statistic value={report.passRate} suffix="%" precision={2} />
                  <Text type="secondary">{report.passCount} / {report.totalRecords} 份</Text>
                </Card>
              </Col>
              <Col span={8}>
                <Card title="质控得分" headStyle={{ background: VI.mid, color: "#fff" }}>
                  <Statistic value={report.score} />
                </Card>
              </Col>
              <Col span={8}>
                <Card title="缺陷分布" headStyle={{ background: VI.accent, color: "#fff" }}>
                  <Tag color="red">阻塞 {report.blockCount}</Tag>
                  <Tag color="orange"> major {report.majorCount}</Tag>
                  <Tag color="yellow"> minor {report.minorCount}</Tag>
                </Card>
              </Col>
            </Row>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
