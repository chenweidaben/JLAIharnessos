/**
 * 健澜科技 jlmedaios - 质控评分规则配置前端页（M492-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：评分规则列表 Table（规则ID/名称/权重 Slider）+ 权重配置。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Layout, Slider, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface ScoreRule {
  id: string;
  name: string;
  weight: number;
}

interface ScoreRuleAggregate {
  count: number;
  totalWeight: number;
}

export default function EmrQcScoreRulePage() {
  const [rules, setRules] = useState<ScoreRule[]>([]);
  const [aggregate, setAggregate] = useState<ScoreRuleAggregate>({ count: 0, totalWeight: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-score-rule", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setRules(data?.data?.rules ?? []);
          setAggregate(data?.data?.aggregate ?? { count: 0, totalWeight: 0 });
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const columns = [
    { title: "规则ID", dataIndex: "id", key: "id" },
    { title: "规则名称", dataIndex: "name", key: "name" },
    {
      title: "权重",
      dataIndex: "weight",
      key: "weight",
      render: (weight: number) => (
        <Slider
          defaultValue={weight}
          max={100}
          style={{ width: 200 }}
          onChange={(v) => message.info(`调整权重：${v}`)}
        />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控评分规则配置</Title>
        <Card style={{ marginBottom: 16 }}>
          <Text strong>规则总数：{aggregate.count}</Text>
          <Text style={{ marginLeft: 24 }}>权重总和：{aggregate.totalWeight}</Text>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="评分规则列表">
          <Table columns={columns} dataSource={rules} rowKey="id" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
