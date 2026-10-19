/**
 * 健澜科技 jlmedaios - 资产盘点周期 V13 页（M305-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AuditItem {
  experienceId: string;
  title: string;
  assetScore: number;
}

interface Notice {
  deptHead: string;
  message: string;
  itemCount: number;
}

interface Resp {
  needsAudit: boolean;
  checklist: AuditItem[];
  notice: Notice;
}

export default function AssetAuditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/asset-audit");
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
        <Title level={3} style={{ color: VI.deep }}>资产盘点</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card style={{ marginBottom: 16 }}>
              {data.needsAudit
                ? <Tag color="orange" style={{ fontSize: 16 }}>需盘点（&gt;90天）</Tag>
                : <Tag color="green" style={{ fontSize: 16 }}>盘点周期内</Tag>}
              <div style={{ marginTop: 12 }}>{data.notice.message}</div>
            </Card>
            <Card title="待复核清单（按资产分升序）">
              <List
                dataSource={data.checklist}
                renderItem={(it) => (
                  <List.Item>
                    <List.Item.Meta title={it.title} description={`资产分 ${it.assetScore}`} />
                    <Tag color="default">待复核</Tag>
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
