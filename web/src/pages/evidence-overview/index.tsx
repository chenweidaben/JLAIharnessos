/**
 * 健澜科技 jlmedaios - 疗效证据总览 V13 页（M300-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Overview {
  strongCount: number;
  moderateCount: number;
  weakCount: number;
  inconclusiveCount: number;
  circuitBrokenCount: number;
  coverage: number;
  gap: string;
}

export default function EvidenceOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Overview>("/api/v1/evidence-overview");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>学习飞轮·疗效锚点总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={4}><Card><Statistic title="强证据" value={data.strongCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="中证据" value={data.moderateCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="弱证据" value={data.weakCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="不确定" value={data.inconclusiveCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="已熔断" value={data.circuitBrokenCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="覆盖率" value={data.coverage} suffix="%" /></Card></Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              {data.gap
                ? <Tag color="red" style={{ fontSize: 16 }}>{data.gap}</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>证据体系健康</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
