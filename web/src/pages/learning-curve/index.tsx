/**
 * 健澜科技 jlmedaios - 个人学习曲线 V13 页（M303-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Point {
  weekLabel: string;
  adoptionRate: number;
}

interface Resp {
  curve: Point[];
  slope: number;
  plateauHint: string;
}

export default function LearningCurvePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/learning-curve?doctorId=dr-001");
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
        <Title level={3} style={{ color: VI.deep }}>个人学习曲线</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="学习斜率（末周-首周）" value={data.slope} suffix="pp" />
              {data.plateauHint
                ? <Tag color="orange" style={{ marginTop: 12 }}>{data.plateauHint}</Tag>
                : <Tag color="green" style={{ marginTop: 12 }}>持续进步中</Tag>}
            </Card>
            <Card title="每周采纳率">
              <List
                dataSource={data.curve}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.weekLabel}</span><span>{it.adoptionRate}%</span>
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
