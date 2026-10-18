/**
 * 健澜科技 jlmedaios - 新生儿护理管理 V13 页（M428-A，换名避让旧版 neonatalMgmtV13（M412，-care 后缀））
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
  neonatalMortalityRate: number;
  neonatalAsphyxiaOccurrenceRate: number;
  neonatalJaundiceMonitoringRate: number;
}

export default function NeonatalCareMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/neonatal-care-mgmt");
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
        <Title level={3} style={{ color: VI.deep }}>新生儿护理管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="新生儿死亡率（‰，越低越好）" value={data.neonatalMortalityRate} suffix="‰" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="新生儿窒息发生率（‰，越低越好）" value={data.neonatalAsphyxiaOccurrenceRate} suffix="‰" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="新生儿黄疸监测率" value={data.neonatalJaundiceMonitoringRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
