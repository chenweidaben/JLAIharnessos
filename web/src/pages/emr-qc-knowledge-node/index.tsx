/**
 * 健澜科技 jlmedaios - 质控知识节点管理前端页（M489-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：知识节点列表 Table（节点ID/名称/类型 Tag）+ 新增按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface KnowledgeNode {
  id: string;
  name: string;
  type: string;
}

interface NodeAggregate {
  count: number;
  types: string[];
}

const typeColor: Record<string, string> = {
  疾病: "red",
  药物: "blue",
  症状: "orange",
};

const columns = [
  { title: "节点ID", dataIndex: "id", key: "id" },
  { title: "名称", dataIndex: "name", key: "name" },
  {
    title: "类型",
    dataIndex: "type",
    key: "type",
    render: (type: string) => <Tag color={typeColor[type] ?? "default"}>{type}</Tag>,
  },
];

export default function EmrQcKnowledgeNodePage() {
  const [nodes, setNodes] = useState<KnowledgeNode[]>([]);
  const [aggregate, setAggregate] = useState<NodeAggregate>({ count: 0, types: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-knowledge-node", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setNodes(data?.data?.nodes ?? []);
          setAggregate(data?.data?.aggregate ?? { count: 0, types: [] });
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控知识节点管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Typography.Text strong>节点总数：{aggregate.count}</Typography.Text>
          <Typography.Text style={{ marginLeft: 24 }}>
            类型：{aggregate.types.map((t) => <Tag key={t} color={typeColor[t] ?? "default"}>{t}</Tag>)}
          </Typography.Text>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="知识节点列表" extra={<Button type="primary" style={{ background: VI.accent }}>新增节点</Button>}>
          <Table columns={columns} dataSource={nodes} rowKey="id" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
