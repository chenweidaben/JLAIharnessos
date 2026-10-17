/**
 * 健澜科技 jlmedaios - 灰度发布与回滚 V5 页（M286-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Deploy {
  id: string;
  version: string;
  strategy: string;
  canaryPct: number;
  status: string;
}

interface Result {
  deploys: Deploy[];
  report: { totalDeploys: number; rolledBackCount: number; canaryActive: number };
}

export default function OpsReleasePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/ops-release");
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
        <Title level={3} style={{ color: VI.deep }}>灰度发布</Title>
        <Paragraph type="secondary">灰度比例·一键回滚·发布记录</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="总发布" value={data.report.totalDeploys} /></Card></Col>
              <Col span={8}><Card><Statistic title="回滚" value={data.report.rolledBackCount} /></Card></Col>
              <Col span={8}><Card><Statistic title="灰度中" value={data.report.canaryActive} /></Card></Col>
            </Row>
            <Card title="发布列表" style={{ marginTop: 16 }}>
              <List
                dataSource={data.deploys}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${d.version} (${d.strategy})`}
                      description={`灰度 ${d.canaryPct}%`}
                    />
                    <Tag color={d.status === "rolled-back" ? "red" : d.status === "full" ? "green" : "blue"}>
                      {d.status}
                    </Tag>
                  </List.Item>
                )}
              />
            </Card>
          </>
        )}
      </Content>
    </Layout>
  );
}
