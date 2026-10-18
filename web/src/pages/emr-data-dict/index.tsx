/**
 * 健澜科技 jlmedaios - 病历质控数据字典管理前端页（M473-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：字典表格（分类/编码/标签）+ 分类筛选下拉 + 搜索框。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, Select, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DictItem {
  id: string;
  category: string;
  code: string;
  label: string;
}

export default function EmrDataDictPage() {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<DictItem[]>([]);
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState("");

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const params = new URLSearchParams();
        if (keyword) params.set("keyword", keyword);
        if (category) params.set("category", category);
        const url = `/api/v1/emr-data-dict${params.toString() ? `?${params.toString()}` : ""}`;
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
  }, [keyword, category]);

  const columns = [
    { title: "分类", dataIndex: "category", key: "category", render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: "编码", dataIndex: "code", key: "code" },
    { title: "标签", dataIndex: "label", key: "label" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历质控数据字典管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input.Search
            placeholder="搜索标签，如：入院"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            style={{ maxWidth: 300, marginRight: 16 }}
            allowClear
          />
          <Select
            value={category || "all"}
            onChange={(v) => setCategory(v === "all" ? "" : v)}
            style={{ width: 200 }}
            options={[
              { value: "all", label: "全部分类" },
              { value: "病历类型", label: "病历类型" },
              { value: "缺陷等级", label: "缺陷等级" },
            ]}
          />
        </Card>
        <Card title="字典列表" headStyle={{ background: VI.mid, color: "#fff" }}>
          <Spin spinning={loading}>
            <Table dataSource={items} columns={columns} rowKey="id" pagination={false} />
          </Spin>
        </Card>
      </Content>
    </Layout>
  );
}
