/**
 * 健澜科技 jlmedaios - 病历质控指标字典管理前端页（M472-A 新规格，V14，EMR 深化四模块）
 *
 * 深海蓝VI：指标字典表格（指标名/单位/方向箭头 ↑↓）+ 搜索框。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface IndicatorItem {
  id: string;
  name: string;
  unit: string;
  direction: "higher" | "lower";
}

export default function EmrIndicatorDictPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<IndicatorItem[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const url = keyword
          ? `/api/v1/emr-indicator-dict?keyword=${encodeURIComponent(keyword)}`
          : "/api/v1/emr-indicator-dict";
        const resp = await fetch(url, {
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
  }, [keyword]);

  const columns = [
    { title: "指标名", dataIndex: "name", key: "name" },
    { title: "单位", dataIndex: "unit", key: "unit" },
    {
      title: "方向",
      dataIndex: "direction",
      key: "direction",
      render: (v: string) => {
        if (v === "higher") return <Tag color="green">↑ 越高越好</Tag>;
        return <Tag color="red">↓ 越低越好</Tag>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控指标字典管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索指标名，如：通过率"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 400 }}
            allowClear
          />
        </Card>
        <Card title="指标字典列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={items} columns={columns} rowKey="id" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
