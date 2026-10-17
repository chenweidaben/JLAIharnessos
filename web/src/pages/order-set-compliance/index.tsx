/**
 * 健澜科技 jlmedaios - 医嘱套餐规范 V13 页（M315-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ReasonRow {
  reason: string;
  count: number;
}

interface Resp {
  dept: string;
  usageRate: number;
  deviationRate: number;
  reasons: ReasonRow[];
}

export default function OrderSetCompliancePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/order-set-compliance?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>医嘱套餐规范</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`统计（${data.dept}）`} style={{ marginBottom: 16 }}>
              <Statistic title="套餐使用率" value={data.usageRate} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="偏离率" value={data.deviationRate} suffix="%" valueStyle={{ color: "#cf1322" }} />
            </Card>
            <Card title="偏离原因分类">
              <List
                dataSource={data.reasons}
                renderItem={(r) => (
                  <List.Item>
                    <span>{r.reason}</span>
                    <Tag color="orange">{r.count}</Tag>
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
