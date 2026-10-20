/**
 * 健澜科技 jlmedaios - 反向证据熔断 V13 页（M300-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Alert, Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Broken {
  experienceId: string;
  title: string;
  effectSize: number;
  status: "circuit_broken";
}

interface Report {
  brokenCount: number;
  avgEffectSize: number;
  action: string;
}

interface Resp {
  broken: Broken[];
  report: Report;
}

export default function CircuitBreakerPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/circuit-breaker");
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
        <Title level={3} style={{ color: VI.deep }}>反向证据熔断</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Alert
              type="error"
              showIcon
              message={data.report.action}
              description={`平均并发症升高 ${data.report.avgEffectSize} 个百分点`}
              style={{ marginBottom: 16 }}
            />
            <Card title="已熔断经验列表">
              <List
                dataSource={data.broken}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.title}
                      description={`效应量 +${it.effectSize}（反向）`}
                    />
                    <Tag color="red">circuit_broken</Tag>
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
