/**
 * 健澜科技 jlmedaios - 质量门禁总览 V13 页（M299-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dashboard {
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  rolledbackCount: number;
  reviewerCount: number;
  passRate: number;
  risk: string;
}

export default function QualityGatePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Dashboard | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Dashboard>("/api/v1/quality-gate");
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
        <Title level={3} style={{ color: VI.deep }}>经验质量门禁总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={4}><Card><Statistic title="待审" value={data.pendingCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="通过" value={data.approvedCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="驳回" value={data.rejectedCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="回滚" value={data.rolledbackCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="评审专家" value={data.reviewerCount} /></Card></Col>
              <Col span={4}><Card><Statistic title="通过率" value={data.passRate} suffix="%" /></Card></Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              {data.risk
                ? <Tag color="red" style={{ fontSize: 16 }}>{data.risk}</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>质量门禁健康</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
