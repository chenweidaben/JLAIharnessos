/**
 * 健澜科技 jlmedaios - 手术排程冲突检测 V13 页（M312-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Pair {
  a: string;
  b: string;
  reason: string;
}

interface Resp {
  date: string;
  surgeonConflicts: Pair[];
  roomConflicts: Pair[];
  gapAlerts: Pair[];
}

export default function OtSchedulingConflictPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/ot-scheduling-conflict?date=2026-10-17");
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
        <Title level={3} style={{ color: VI.deep }}>手术排程冲突检测</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="医生冲突（红 Tag）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.surgeonConflicts}
                renderItem={(p) => (
                  <List.Item>
                    <span>{p.a} ↔ {p.b}</span>
                    <Tag color="red">{p.reason}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="手术室冲突（红 Tag）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.roomConflicts}
                renderItem={(p) => (
                  <List.Item>
                    <span>{p.a} ↔ {p.b}</span>
                    <Tag color="red">{p.reason}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="连台间隔不足（橙 Tag）">
              <List
                dataSource={data.gapAlerts}
                renderItem={(p) => (
                  <List.Item>
                    <span>{p.a} → {p.b}</span>
                    <Tag color="orange">{p.reason}</Tag>
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
