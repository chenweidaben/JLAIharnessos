/**
 * 健澜科技 jlmedaios - 医保结算 V13 页（M345-A，stats 避让 M329-D）
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
  settlementAmount: number;
  rejectedAmount: number;
  rejectionRate: number;
}

export default function InsuranceSettlementStatsPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/insurance-settlement-stats");
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
        <Title level={3} style={{ color: VI.deep }}>医保结算</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="月度结算金额" value={data.settlementAmount} suffix="万元" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="拒付金额" value={data.rejectedAmount} suffix="万元" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="拒付率" value={data.rejectionRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
