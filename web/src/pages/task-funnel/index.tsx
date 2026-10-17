/**
 * 健澜科技 jlmedaios - 任务进度追踪与升级 V13 页（M307-B）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Funnel {
  open: number;
  inProgress: number;
  done: number;
  escalated: number;
}

interface Escalated {
  taskId: string;
  owner: string;
  status: string;
}

interface Resp {
  funnel: Funnel;
  overdueCount: number;
  escalatedList: Escalated[];
}

export default function TaskFunnelPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/task-funnel");
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
        <Title level={3} style={{ color: VI.deep }}>任务漏斗</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <>
            <Row gutter={16} style={{ marginBottom: 16 }}>
              <Col span={6}><Card><Statistic title="open" value={data.funnel.open} /></Card></Col>
              <Col span={6}><Card><Statistic title="in_progress" value={data.funnel.inProgress} /></Card></Col>
              <Col span={6}><Card><Statistic title="done" value={data.funnel.done} /></Card></Col>
              <Col span={6}><Card><Statistic title="escalated" value={data.funnel.escalated} /></Card></Col>
            </Row>
            <Card title={`自动升级清单（${data.overdueCount} 条逾期）`}>
              <List
                dataSource={data.escalatedList}
                renderItem={(it) => (
                  <List.Item>
                    <span>{it.taskId}</span>
                    <Tag color="orange">{it.status} → {it.owner}</Tag>
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
