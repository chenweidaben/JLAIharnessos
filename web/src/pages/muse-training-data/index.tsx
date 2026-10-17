/**
 * 健澜科技 jlmedaios - 个人智能体训练数据沉淀 V13 页（M319-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface FlywheelPoint {
  week: string;
  cumulativeSamples: number;
}

interface Resp {
  doctorId: string;
  totalSamples: number;
  successRate: number;
  flywheelTrend: FlywheelPoint[];
}

export default function MuseTrainingDataPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/muse-training-data?doctorId=D01");
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
        <Title level={3} style={{ color: VI.deep }}>个人智能体训练数据沉淀</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="训练数据概览" style={{ marginBottom: 16 }}>
              <Statistic title="累计样本量" value={data.totalSamples} style={{ marginRight: 48 }} />
              <Statistic title="成功率" value={data.successRate} suffix="%" />
            </Card>
            <Card title="飞轮趋势（按周累计）">
              <List
                dataSource={data.flywheelTrend}
                renderItem={(p) => (
                  <List.Item>
                    <span>{p.week}</span>
                    <Tag color="blue">{p.cumulativeSamples} 样本</Tag>
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
