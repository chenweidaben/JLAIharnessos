/**
 * 健澜科技 jlmedaios - 跨科室扩散总览 V13 页（M304-D）
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
  totalBroadcasts: number;
  totalAdoptions: number;
  adoptionRate: number;
  influencerDepts: number;
  isolatedDepts: number;
  maturity: number;
  gap: string;
}

export default function DiffusionOverviewPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Overview | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Overview>("/api/v1/diffusion-overview");
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
        <Title level={3} style={{ color: VI.deep }}>跨科室扩散总览</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={4}><Card><Statistic title="广播" value={data.totalBroadcasts} /></Card></Col>
              <Col span={4}><Card><Statistic title="采纳" value={data.totalAdoptions} /></Card></Col>
              <Col span={4}><Card><Statistic title="采纳率" value={data.adoptionRate} suffix="%" /></Card></Col>
              <Col span={4}><Card><Statistic title="输出科室" value={data.influencerDepts} /></Card></Col>
              <Col span={4}><Card><Statistic title="孤岛" value={data.isolatedDepts} /></Card></Col>
              <Col span={4}><Card><Statistic title="成熟度" value={data.maturity} /></Card></Col>
            </Row>
            <Card style={{ marginTop: 16 }}>
              {data.gap
                ? <Tag color="red" style={{ fontSize: 16 }}>{data.gap}</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>跨科室扩散运行良好</Tag>}
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
