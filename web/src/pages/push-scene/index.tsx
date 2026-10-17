/**
 * 健澜科技 jlmedaios - 推送时机与场景触发 V13 页（M302-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Alert, Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Push {
  experienceId: string;
  title: string;
}

interface Resp {
  scene: string;
  score: number;
  eligible: boolean;
  sceneLabel?: string;
  triggerTiming?: string;
  pushList: Push[];
}

export default function PushScenePage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/push-scene?scene=order_write");
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
        <Title level={3} style={{ color: VI.deep }}>场景化推送</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            {data.eligible
              ? (
                <Alert
                  type="info"
                  showIcon
                  message={`当前场景：${data.sceneLabel}（时机分 ${data.score}）`}
                  description={`触发时机：${data.triggerTiming}`}
                  style={{ marginBottom: 16 }}
                />
              )
              : (
                <Alert
                  type="warning"
                  showIcon
                  message={`当前场景时机分 ${data.score} 未达门槛，不推送`}
                  style={{ marginBottom: 16 }}
                />
              )}
            <Card title="本场景推送列表">
              <List
                dataSource={data.pushList}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} />
                    <Tag color="blue">推荐</Tag>
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
