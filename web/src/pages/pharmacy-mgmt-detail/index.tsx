/**
 * 健澜科技 jlmedaios - 药事管理（细节）V13 页（M418-A，detail 避让旧版 prescriptionReview/drugCatalog/drugDelivery/drugSafety）
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
  prescriptionReviewPassRate: number;
  drugSupplyTimelyRate: number;
  drugRecallComplianceRate: number;
}

export default function PharmacyMgmtDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/pharmacy-mgmt-detail");
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
        <Title level={3} style={{ color: VI.deep }}>药事管理（细节）</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="处方点评合格率" value={data.prescriptionReviewPassRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="药品供应及时率" value={data.drugSupplyTimelyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="药品召回合规率" value={data.drugRecallComplianceRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
