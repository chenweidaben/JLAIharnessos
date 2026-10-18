/**
 * 健澜科技 jlmedaios - 病历复制痕迹保留前端页（M463-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：复制痕迹审计表（源病历/目标病历/操作人/时间）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CopyTrace {
  traceId: string;
  sourceNoteId: string;
  targetNoteId: string;
  userId: string;
  copiedAt: string;
}

export default function EmrCopyTracePage() {
  const [loading, setLoading] = useState(true);
  const [traces, setTraces] = useState<CopyTrace[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-copy-trace/demo001", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setTraces(data?.traces ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const columns = [
    { title: "源病历", dataIndex: "sourceNoteId", key: "sourceNoteId" },
    { title: "目标病历", dataIndex: "targetNoteId", key: "targetNoteId" },
    {
      title: "操作人",
      dataIndex: "userId",
      key: "userId",
      render: (userId: string) => <Tag color="blue">{userId}</Tag>,
    },
    { title: "复制时间", dataIndex: "copiedAt", key: "copiedAt" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历复制痕迹保留</Title>
        <Card title="复制痕迹审计表" headStyle={{ background: VI.deep, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table rowKey="traceId" columns={columns} dataSource={traces} pagination={false} size="small" />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
