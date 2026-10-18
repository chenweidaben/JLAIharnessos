/**
 * 健澜科技 jlmedaios - 病历质控整改工单管理前端页（M471-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：工单看板（三列 pending/inProgress/completed）+ 创建/完成按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Col, Layout, Row, Spin, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Order {
  id: string;
  defect: string;
  assignee: string;
  status: "pending" | "inProgress" | "completed";
}

export default function EmrRectificationOrderPage() {
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-rectification-order", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setOrders(data?.orders ?? []);
        }
      } catch {
        // graceful
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const statusColor = (status: string) => {
    if (status === "pending") return "orange";
    if (status === "inProgress") return "blue";
    return "green";
  };

  const columns = [
    { title: "待处理 (pending)", dataIndex: "pending", key: "pending" },
    { title: "进行中 (inProgress)", dataIndex: "inProgress", key: "inProgress" },
    { title: "已完成 (completed)", dataIndex: "completed", key: "completed" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控整改工单管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Button type="primary" style={{ background: VI.accent }}>+ 创建工单</Button>
        </Card>
        <Spin spinning={loading}>
          <Row gutter={16}>
            {columns.map((col) => (
              <Col span={8} key={col.key}>
                <Card title={col.title} headStyle={{ background: VI.mid, color: "#fff" }} size="small">
                  {orders.filter((o) => o.status === col.key).map((order) => (
                    <Card key={order.id} size="small" style={{ marginBottom: 8 }}>
                      <Text strong>{order.defect}</Text>
                      <br />
                      <Text type="secondary">处理人：{order.assignee}</Text>
                      <br />
                      <Tag color={statusColor(order.status)} style={{ marginTop: 8 }}>
                        {order.status}
                      </Tag>
                    </Card>
                  ))}
                </Card>
              </Col>
            ))}
          </Row>
        </Spin>
      </Content>
    </Layout>
  );
}
