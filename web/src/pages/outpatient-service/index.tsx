/**
 * 健澜科技 jlmedaios - 门诊服务 V13 页（M372-A）
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
  outpatientCount: number;
  outpatientAverageWaitTime: number;
  outpatientAppointmentRate: number;
}

export default function OutpatientServicePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/outpatient-service");
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
        <Title level={3} style={{ color: VI.deep }}>门诊服务</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="门诊人次" value={data.outpatientCount} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="门诊平均候诊时间" value={data.outpatientAverageWaitTime} precision={2} suffix="分钟" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="门诊预约率" value={data.outpatientAppointmentRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
