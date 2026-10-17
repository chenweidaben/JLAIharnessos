/**
 * 健澜科技 jlmedaios - 处方点评统计 V13 页（M388-A，stats 避让）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  prescriptionReviewCount: number;
  irrationalPrescriptionRate: number;
  specialPrescriptionReviewCount: number;
}

export default function PrescriptionReviewStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/prescription-review-stats");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>处方点评统计</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="处方点评数" value={data.prescriptionReviewCount} suffix="张" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="不合理处方率" value={data.irrationalPrescriptionRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="专项处方点评数" value={data.specialPrescriptionReviewCount} suffix="张" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
