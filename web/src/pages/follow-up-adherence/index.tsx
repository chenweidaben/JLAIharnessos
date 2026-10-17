/**
 * 健澜科技 jlmedaios - 出院随访依从性 V13 页（M316-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Rates {
  shouldRate: number;
  followedRate: number;
  lostRate: number;
}

interface Resp {
  dept: string;
  rates: Rates;
  adherence: number;
  lostPatients: string[];
}

export default function FollowUpAdherencePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/follow-up-adherence?dept=cardio");
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
        <Title level={3} style={{ color: VI.deep }}>出院随访依从性</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title={`依从性（${data.dept}）`} style={{ marginBottom: 16 }}>
              <Statistic title="依从性总分" value={data.adherence} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="应随访率" value={data.rates.shouldRate} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="已随访率" value={data.rates.followedRate} suffix="%" style={{ marginRight: 48 }} />
              <Statistic title="失访率" value={data.rates.lostRate} suffix="%" valueStyle={{ color: "#cf1322" }} />
            </Card>
            <Card title="失访高风险患者">
              <List
                dataSource={data.lostPatients}
                renderItem={(pid) => (
                  <List.Item>
                    <Tag color="red">{pid}</Tag>
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
