/**
 * 健澜科技 jlmedaios - DRG 绩效 V13 页（M356-A）
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
  coveredGroups: number;
  cmi: number;
  timeConsumptionIndex: number;
  costConsumptionIndex: number;
}

export default function DrgPerformancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/drg-performance");
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
        <Title level={3} style={{ color: VI.deep }}>DRG 绩效</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic title="DRG 覆盖组数" value={data.coveredGroups} suffix="组" />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="CMI 值" value={data.cmi} precision={3} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="时间消耗指数" value={data.timeConsumptionIndex} precision={3} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="费用消耗指数" value={data.costConsumptionIndex} precision={3} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
