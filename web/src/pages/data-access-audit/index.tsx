/**
 * 健澜科技 jlmedaios - 数据访问审计异常 V13 页（M318-D）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, List, Spin, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface LogRow {
  logId: string;
  userId: string;
  accessHour: number;
  hasPermission: boolean;
  exportRecordCount: number;
}

interface Resp {
  userId: string;
  afterHours: LogRow[];
  overAccess: LogRow[];
  bulkExport: LogRow[];
}

export default function DataAccessAuditPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/data-access-audit?userId=u1");
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
        <Title level={3} style={{ color: VI.deep }}>数据访问审计异常</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Card title="非工作时间访问（18:00-次日 8:00）" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.afterHours}
                renderItem={(l) => (
                  <List.Item>
                    <span>{l.logId} · {l.accessHour}:00</span>
                    <Tag color="red">非工作时间</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="越权访问" style={{ marginBottom: 16 }}>
              <List
                dataSource={data.overAccess}
                renderItem={(l) => (
                  <List.Item>
                    <span>{l.logId} · {l.accessHour}:00</span>
                    <Tag color="red">越权</Tag>
                  </List.Item>
                )}
              />
            </Card>
            <Card title="批量导出（>1000 条）">
              <List
                dataSource={data.bulkExport}
                renderItem={(l) => (
                  <List.Item>
                    <span>{l.logId} · 导出 {l.exportRecordCount} 条</span>
                    <Tag color="red">批量导出</Tag>
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
