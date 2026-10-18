/**
 * 健澜科技 jlmedaios - 手术室质量管理 V13 页（M429-C，-quality 后缀避让旧版 operatingRoomMgmtV13（M417））
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
  operatingRoomSterilePassRate: number;
  operatingRoomContinuousSurgeryMinutes: number;
  operatingRoomConsumableWasteRate: number;
}

export default function OperatingRoomQualityMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/operating-room-quality-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>手术室质量管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="手术室无菌合格率" value={data.operatingRoomSterilePassRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="手术室连台时间" value={data.operatingRoomContinuousSurgeryMinutes} suffix="分钟" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="手术室耗材浪费率（越低越好）" value={data.operatingRoomConsumableWasteRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
