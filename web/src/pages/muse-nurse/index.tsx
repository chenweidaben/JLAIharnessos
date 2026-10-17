/**
 * 健澜科技 jlmedaios - 护士 MUSE 工作台 V5 页（M283-B）
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
  totalRounds: number;
  highRiskCount: number;
  ward: string;
}

export default function MuseNursePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/muse-nurse");
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
        <Title level={3} style={{ color: VI.deep }}>护士 MUSE 工作台</Title>
        <Paragraph type="secondary">巡视计划·高风险标记·任务完成</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="今日巡视" value={data.totalRounds} /></Card></Col>
            <Col span={8}><Card><Statistic title="高风险患者" value={data.highRiskCount} /></Card></Col>
            <Col span={8}><Card><Statistic title="所在病区" value={data.ward} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
