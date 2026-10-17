/**
 * 健澜科技 jlmedaios - MUSE 投入产出报告 V13 页（M321-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface RoiSummary {
  totalCalls: number;
  workHoursSaved: number;
  adverseEventsReduced: number;
  adoptedSuggestions: number;
}

interface Resp {
  roiSummary: RoiSummary;
  workHoursSaved: number;
  nextMonthProjection: number;
}

export default function MuseRoiReportPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/muse-roi-report");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>MUSE 投入产出报告</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="ROI 汇总" style={{ marginBottom: 16 }}>
              <Row gutter={16}>
                <Col span={6}>
                  <Statistic title="累计调用量" value={data.roiSummary.totalCalls} />
                </Col>
                <Col span={6}>
                  <Statistic title="节省工时" value={data.roiSummary.workHoursSaved} suffix="h" />
                </Col>
                <Col span={6}>
                  <Statistic title="不良事件下降" value={data.roiSummary.adverseEventsReduced} />
                </Col>
                <Col span={6}>
                  <Statistic title="建议采纳转化" value={data.roiSummary.adoptedSuggestions} />
                </Col>
              </Row>
            </Card>
            <Card>
              <Statistic title="下月预测调用量" value={data.nextMonthProjection} />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
