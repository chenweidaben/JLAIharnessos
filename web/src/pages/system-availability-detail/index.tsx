/**
 * 健澜科技 jlmedaios - 系统可用性明细 V13 页（M379-C，detail 避让）
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
  coreSystemAvailabilityRate: number;
  plannedDowntimeHours: number;
  unplannedDowntimeCount: number;
}

export default function SystemAvailabilityDetailPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/system-availability-detail");
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
        <Title level={3} style={{ color: VI.deep }}>系统可用性明细</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="核心系统年可用率" value={data.coreSystemAvailabilityRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="计划停机时长" value={data.plannedDowntimeHours} suffix="小时" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="故障停机次数" value={data.unplannedDowntimeCount} suffix="次" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
