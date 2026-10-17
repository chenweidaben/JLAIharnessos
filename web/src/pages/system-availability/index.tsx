/**
 * 健澜科技 jlmedaios - 核心系统可用率 V13 页（M344-A）
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
  hisAvailability: number;
  emrAvailability: number;
  lisAvailability: number;
  pacsAvailability: number;
}

export default function SystemAvailabilityPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/system-availability");
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
        <Title level={3} style={{ color: VI.deep }}>核心系统可用率</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}>
              <Card>
                <Statistic title="HIS 月度可用率" value={data.hisAvailability} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="EMR 月度可用率" value={data.emrAvailability} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="LIS 月度可用率" value={data.lisAvailability} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Statistic title="PACS 月度可用率" value={data.pacsAvailability} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
