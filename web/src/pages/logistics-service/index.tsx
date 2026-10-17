/**
 * 健澜科技 jlmedaios - 后勤服务 V13 页（M377-A）
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
  beddingWashCount: number;
  mealSupplyCount: number;
  propertyWorkOrderCompletionRate: number;
}

export default function LogisticsServicePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/logistics-service");
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
        <Title level={3} style={{ color: VI.deep }}>后勤服务</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="被服洗涤量" value={data.beddingWashCount} suffix="件" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="膳食供应人次" value={data.mealSupplyCount} suffix="人次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="物业工单完成率" value={data.propertyWorkOrderCompletionRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
