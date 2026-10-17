/**
 * 健澜科技 jlmedaios - 隐私计算与联邦学习 V5 页（M282-D）
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
  totalTasks: number;
  totalOrgs: number;
  avgGlobalAccuracy: number;
}

export default function FederatedLearningPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/federated-learning/metrics");
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
        <Title level={3} style={{ color: VI.deep }}>隐私计算与联邦学习 V5</Title>
        <Paragraph type="secondary">跨院联合建模·数据不出域·全局模型收益</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}><Card><Statistic title="联邦任务" value={data.totalTasks} /></Card></Col>
            <Col span={8}><Card><Statistic title="参与机构" value={data.totalOrgs} /></Card></Col>
            <Col span={8}><Card><Statistic title="全局准确率" value={`${data.avgGlobalAccuracy}%`} /></Card></Col>
          </Row>
        )}
      </Content>
    </Layout>
  );
}
