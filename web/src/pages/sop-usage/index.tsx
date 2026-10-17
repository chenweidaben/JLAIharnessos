/**
 * 健澜科技 jlmedaios - SOP 引用次数回灌飞轮分 V13 页（M309-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Doctor {
  doctorId: string;
  baseScore: number;
  usageCount: number;
  newScore: number;
}

interface Resp {
  doctors: Doctor[];
  newFlywheelScore: number;
}

export default function SopUsagePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/sop-usage");
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
        <Title level={3} style={{ color: VI.deep }}>SOP 引用榜</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="回灌后飞轮分" value={data.newFlywheelScore} />
            </Card>
            <Card title="医生经验分增量">
              <List
                dataSource={data.doctors}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta
                      title={it.doctorId}
                      description={`基础 ${it.baseScore} · 引用 ${it.usageCount} 次`}
                    />
                    <Tag color="green">新分 {it.newScore}</Tag>
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
