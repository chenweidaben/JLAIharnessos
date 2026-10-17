/**
 * 健澜科技 jlmedaios - 绿色通道 V13 页（M372-D，M372 收官）
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
  greenChannelStartCount: number;
  greenChannelAverageDuration: number;
  greenChannelRescueSuccessRate: number;
}

export default function GreenChannelPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/green-channel");
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
        <Title level={3} style={{ color: VI.deep }}>绿色通道</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="绿色通道启动次数" value={data.greenChannelStartCount} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="绿色通道平均耗时" value={data.greenChannelAverageDuration} precision={2} suffix="分钟" />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="绿色通道抢救成功率" value={data.greenChannelRescueSuccessRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
