/**
 * 健澜科技 jlmedaios - 推送频控与免打扰 V13 页（M302-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Push {
  experienceId: string;
  title: string;
}

interface Dnd {
  startHour: number;
  endHour: number;
  description: string;
}

interface Resp {
  doctorLoad: number;
  quota: number;
  pushList: Push[];
  dnd: Dnd;
}

export default function PushQuotaPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/push-quota?doctorLoad=45");
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
        <Title level={3} style={{ color: VI.deep }}>推送频控</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              <Statistic title="今日接诊" value={data.doctorLoad} />
              <Statistic title="今日剩余配额" value={data.quota} style={{ marginTop: 12 }} />
              <Tag color="orange" style={{ marginTop: 12 }}>免打扰：{data.dnd.description}</Tag>
            </Card>
            <Card title="本日内推送列表">
              <List
                dataSource={data.pushList}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} />
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
