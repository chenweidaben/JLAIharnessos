/**
 * 健澜科技 jlmedaios - 病历质控评分模型前端页（M479-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评分模型表格（模型名/维度/权重）+ 计算结果大数字。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Spin, Table, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Dimension {
  name: string;
  weight: number;
}

interface ScoreModel {
  name: string;
  dimensions: Dimension[];
}

export default function EmrQcScoreModelPage() {
  const [loading, setLoading] = useState(true);
  const [model, setModel] = useState<ScoreModel>({ name: "", dimensions: [] });

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-score-model", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setModel(data?.model ?? { name: "", dimensions: [] });
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
    { title: "维度", dataIndex: "name", key: "name" },
    {
      title: "权重",
      dataIndex: "weight",
      key: "weight",
      render: (weight: number) => <Text strong>{weight}%</Text>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控评分模型</Title>
        <Spin spinning={loading}>
          <Card title={model.name} headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Table dataSource={model.dimensions} columns={columns} rowKey="name" pagination={false} />
          </Card>
          <Card title="计算示例" headStyle={{ background: VI.mid, color: "#fff" }}>
            <Text type="secondary">完整性 90 × 40% + 时效性 80 × 30% + 规范性 100 × 30% = 90 分</Text>
            <Title level={1} style={{ color: VI.accent, margin: "16px 0 0 0" }}>90 分</Title>
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
