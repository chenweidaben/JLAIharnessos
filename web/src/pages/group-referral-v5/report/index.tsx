/**
 * 健澜科技 jlmedaios - 集团患者转诊与资源调度 V5 页（M273-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Statistic, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Result {
  timeRange: string;
  metrics: { intraGroupReferralVolume: number; avgWait: number; bedTurnover: number; resourceUtilization: number };
}

export default function GroupReferralV5Page() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/group-referral-v5/report");
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
        <Title level={3} style={{ color: VI.deep }}>集团患者转诊与资源调度 V5</Title>
        <Paragraph type="secondary">集团内转诊·上转·下转·绿通 / 资源调度·床位·手术间·专家·设备</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={6}><Card><Statistic title="集团内转诊" value={data.metrics.intraGroupReferralVolume} /></Card></Col>
            <Col span={6}><Card><Statistic title="平均等待" value={`${data.metrics.avgWait}天`} /></Card></Col>
            <Col span={6}><Card><Statistic title="床位周转" value={`${data.metrics.bedTurnover}次`} /></Card></Col>
            <Col span={6}><Card><Statistic title="资源利用率" value={`${data.metrics.resourceUtilization}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
