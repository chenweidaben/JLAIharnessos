/**
 * 健澜科技 jlmedaios - 信息系统可用性管理 V13 页（M446-A，信息化建设与数据安全管理组）
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
  systemAvailabilityRate: number;
  systemAvailabilityMajorFaultCount: number;
  systemAvailabilityPlannedDowntimeHours: number;
}

export default function SystemAvailabilityMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/system-availability-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>信息系统可用性管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="核心系统可用率" value={data.systemAvailabilityRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="重大故障次数" value={data.systemAvailabilityMajorFaultCount} suffix="次" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="计划内停机时长" value={data.systemAvailabilityPlannedDowntimeHours} suffix="小时" />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
