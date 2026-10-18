/**
 * 健澜科技 jlmedaios - 病历质控指标预警阈值配置前端页（M469-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：阈值配置表（指标/警告线/危险线/当前状态徽章）+ 编辑按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AlertItem {
  indicator: string;
  value: number;
  status: "normal" | "warn" | "danger";
}

export default function EmrAlertThresholdPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AlertItem[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-alert-threshold", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) setItems(data?.items ?? []);
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
    { title: "指标", dataIndex: "indicator", key: "indicator" },
    { title: "当前值", dataIndex: "value", key: "value" },
    {
      title: "状态",
      dataIndex: "status",
      key: "status",
      render: (v: string) => {
        if (v === "danger") return <Tag color="red">危险</Tag>;
        if (v === "warn") return <Tag color="orange">警告</Tag>;
        return <Tag color="green">正常</Tag>;
      },
    },
    {
      title: "操作",
      key: "action",
      render: () => <Button size="small">编辑阈值</Button>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控指标预警阈值配置</Title>
        <Card title="阈值配置表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={items} columns={columns} rowKey="indicator" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
