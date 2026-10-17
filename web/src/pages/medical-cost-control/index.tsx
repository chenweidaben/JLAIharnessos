/**
 * 健澜科技 jlmedaios - 费用控制 V13 页（M375-B）
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
  outpatientCostPerVisit: number;
  inpatientCostPerStay: number;
  drugRatio: number;
}

export default function MedicalCostControlPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/medical-cost-control");
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
        <Title level={3} style={{ color: VI.deep }}>费用控制</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="次均门诊费用" value={data.outpatientCostPerVisit} precision={2} prefix="¥" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="次均住院费用" value={data.inpatientCostPerStay} precision={2} prefix="¥" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="药占比" value={data.drugRatio} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
