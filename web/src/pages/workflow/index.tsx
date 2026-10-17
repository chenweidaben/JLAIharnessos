/**
 * 健澜科技 jlmedaios - 智能审批与工作流引擎 V6 页（M288-A）
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Statistic, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title, Paragraph } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DefRow {
  id: string;
  name: string;
  category: string;
  version: string;
  graph: { nodeCount: number; startNodeId: string | null; endNodeId: string | null };
}

interface InstanceSummary {
  runningCount: number;
  instances: { id: string; title: string; applicant: string; currentNodeId: string; status: string }[];
}

export default function WorkflowPage() {
  const [loading, setLoading] = useState(true);
  const [defs, setDefs] = useState<DefRow[]>([]);
  const [summary, setSummary] = useState<InstanceSummary | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const [d, s] = await Promise.all([
          get<DefRow[]>("/api/v1/workflow/definitions"),
          get<InstanceSummary>("/api/v1/workflow/instances"),
        ]);
        if (!cancelled) {
          setDefs(d);
          setSummary(s);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>智能审批工作流</Title>
        <Paragraph type="secondary">流程定义·发起审批·我的待办</Paragraph>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && (
          <>
            <Row gutter={16}>
              <Col span={8}><Card><Statistic title="流程定义" value={defs.length} /></Card></Col>
              <Col span={8}><Card><Statistic title="运行中实例" value={summary?.runningCount ?? 0} /></Card></Col>
              <Col span={8}><Card><Statistic title="我的待办" value={summary?.instances.length ?? 0} /></Card></Col>
            </Row>
            <Card title="流程定义" style={{ marginTop: 16 }}>
              <List
                dataSource={defs}
                renderItem={(d) => (
                  <List.Item>
                    <List.Item.Meta
                      title={`${d.name} (${d.category})`}
                      description={`节点数=${d.graph.nodeCount} 起=${d.graph.startNodeId} 终=${d.graph.endNodeId}`}
                    />
                    <Tag color="blue">{d.version}</Tag>
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
