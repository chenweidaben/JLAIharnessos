/**
 * 健澜科技 jlmedaios - 质控知识关系管理前端页（M489-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：关系列表 Table（关系ID/源节点/目标节点/关系类型 Tag）+ 新增按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface KnowledgeRelation {
  id: string;
  source: string;
  target: string;
  type: string;
}

interface RelationAggregate {
  count: number;
  relationTypes: string[];
}

const typeColor: Record<string, string> = {
  导致: "red",
  治疗: "blue",
  禁忌: "orange",
};

const columns = [
  { title: "关系ID", dataIndex: "id", key: "id" },
  { title: "源节点", dataIndex: "source", key: "source" },
  { title: "目标节点", dataIndex: "target", key: "target" },
  {
    title: "关系类型",
    dataIndex: "type",
    key: "type",
    render: (type: string) => <Tag color={typeColor[type] ?? "default"}>{type}</Tag>,
  },
];

export default function EmrQcKnowledgeRelationPage() {
  const [relations, setRelations] = useState<KnowledgeRelation[]>([]);
  const [aggregate, setAggregate] = useState<RelationAggregate>({ count: 0, relationTypes: [] });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-knowledge-relation", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRelations(data?.data?.relations ?? []);
          setAggregate(data?.data?.aggregate ?? { count: 0, relationTypes: [] });
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
        <Title level={3} style={{ color: VI.deep }}>质控知识关系管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Typography.Text strong>关系总数：{aggregate.count}</Typography.Text>
          <Typography.Text style={{ marginLeft: 24 }}>
            类型：{aggregate.relationTypes.map((t) => <Tag key={t} color={typeColor[t] ?? "default"}>{t}</Tag>)}
          </Typography.Text>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="知识关系列表" extra={<Button type="primary" style={{ background: VI.accent }}>新增关系</Button>}>
          <Table columns={columns} dataSource={relations} rowKey="id" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
