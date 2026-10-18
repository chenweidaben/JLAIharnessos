/**
 * 健澜科技 jlmedaios - 医疗服务价格管理 V13 页（M445-B，医保物价与费用管理组）
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
  priceExecutionAccuracyRate: number;
  priceAdjustmentTimelinessRate: number;
  priceComplaintRate: number;
}

export default function PriceMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/price-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>医疗服务价格管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="价格执行准确率" value={data.priceExecutionAccuracyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="价格调整及时率" value={data.priceAdjustmentTimelinessRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="价格投诉率（越低越好）" value={data.priceComplaintRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
