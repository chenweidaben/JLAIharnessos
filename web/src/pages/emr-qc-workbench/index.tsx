/**
 * 健澜科技 jlmedaios - 科室质控员工作台前端页（M463-D，V14，EMR 深化四模块，M463 收官）
 *
 * 深海蓝VI：三栏工作台（待审病历队列/缺陷待处理/已处理）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, List, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface QcTask {
  id: string;
  title: string;
  dept: string;
  priority: "high" | "medium" | "low";
  status: "pending" | "processing" | "resolved";
  dueAt: string;
}

interface QueueStats {
  pending: number;
  processing: number;
  resolved: number;
}

const PRIORITY_META: Record<string, { color: string; label: string }> = {
  high: { color: "red", label: "高优先级" },
  medium: { color: "orange", label: "中优先级" },
  low: { color: "blue", label: "低优先级" },
};

export default function EmrQcWorkbenchPage() {
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<QueueStats>({ pending: 0, processing: 0, resolved: 0 });
  const [tasks, setTasks] = useState<QcTask[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-workbench", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setQueue(data?.queue ?? { pending: 0, processing: 0, resolved: 0 });
            setTasks(data?.tasks ?? []);
          }
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filterByStatus = (status: string) => tasks.filter((t) => t.status === status);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>科室质控员工作台</Title>
        <Spin spinning={loading}>
          <Row gutter={16}>
            <Col span={8}>
              <Card title={`待审队列（${queue.pending}）`} headStyle={{ background: VI.deep, color: "#fff" }}>
                <List
                  size="small"
                  dataSource={filterByStatus("pending")}
                  renderItem={(task: QcTask) => (
                    <List.Item>
                      <Text>{task.title}</Text>
                      <Tag color={PRIORITY_META[task.priority]?.color}>{PRIORITY_META[task.priority]?.label}</Tag>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title={`处理中（${queue.processing}）`} headStyle={{ background: VI.mid, color: "#fff" }}>
                <List
                  size="small"
                  dataSource={filterByStatus("processing")}
                  renderItem={(task: QcTask) => (
                    <List.Item>
                      <Text>{task.title}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
            <Col span={8}>
              <Card title={`已处理（${queue.resolved}）`} headStyle={{ background: VI.accent, color: "#fff" }}>
                <List
                  size="small"
                  dataSource={filterByStatus("resolved")}
                  renderItem={(task: QcTask) => (
                    <List.Item>
                      <Text>{task.title}</Text>
                    </List.Item>
                  )}
                />
              </Card>
            </Col>
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
