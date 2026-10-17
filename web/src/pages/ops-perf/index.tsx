/**
 * 健澜科技 jlmedaios - 性能与容量压测 V5 页（M286-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface PerfRun {
  scenario: string;
  vusers: number;
  p95Ms: number;
  p99Ms: number;
  throughput: number;
  errorRate: number;
}

interface Result {
  runs: PerfRun[];
  analysis: { bottlenecks: string[]; avgP95Ms: number; avgErrorRate: number };
}

export default function OpsPerfPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Result | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Result>("/api/v1/ops-perf");
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
        <Title level={3} style={{ color: VI.deep }}>性能与容量</Title>
        <Paragraph type="secondary">压测阶梯·P95/P99·容量水位</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="压测次数" value={data.runs.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均P95" value={`${data.analysis.avgP95Ms}ms`} /></Card></Col>
              <Col span={8}><Card><Statistic title="平均错误率" value={`${data.analysis.avgErrorRate}%`} /></Card></Col>
            </Row>
            <Card title="压测结果" style={{ marginTop: 16 }}>
              <List
                dataSource={data.runs}
                renderItem={(r) => (
                  <List.Item>
                    <List.Item.Meta
                      title={r.scenario}
                      description={`VU=${r.vusers} P95=${r.p95Ms}ms 吞吐=${r.throughput}/s`}
                    />
                    {data.analysis.bottlenecks.includes(r.scenario) && <Tag color="red">瓶颈</Tag>}
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
