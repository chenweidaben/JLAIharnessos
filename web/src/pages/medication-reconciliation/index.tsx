/**
 * 健澜科技 jlmedaios - 出院用药重整 V13 页（M314-C）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Med {
  genericName: string;
  dosage: string;
}

interface Diff {
  added: Med[];
  stopped: Med[];
  continued: Med[];
}

interface Resp {
  patientId: string;
  diff: Diff;
  missing: Med[];
  duplicates: string[];
}

export default function MedicationReconciliationPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/medication-reconciliation?patientId=p1");
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
        <Title level={3} style={{ color: VI.deep }}>出院用药重整</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="新增（绿）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.diff.added}
                renderItem={(m) => (
                  <List.Item>
                    <Tag color="green">{m.genericName} {m.dosage}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="停用（红）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.diff.stopped}
                renderItem={(m) => (
                  <List.Item>
                    <Tag color="red">{m.genericName} {m.dosage}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="继续（默认）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.diff.continued}
                renderItem={(m) => (
                  <List.Item>
                    <Tag color="default">{m.genericName} {m.dosage}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="遗漏（橙）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.missing}
                renderItem={(m) => (
                  <List.Item>
                    <Tag color="orange">{m.genericName} {m.dosage}</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="重复（深红）">
              <List
                dataSource={data.duplicates}
                renderItem={(name) => (
                  <List.Item>
                    <Tag color="volcano">{name}</Tag>
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
