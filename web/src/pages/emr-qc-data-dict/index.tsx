/**
 * 健澜科技 jlmedaios - 质控数据字典管理前端页（M498-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：数据字典管理列表（分类/词条）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DataDict {
  category: string;
  items: string[];
}

export default function EmrQcDataDictPage() {
  const [dicts, setDicts] = useState<DataDict[]>([]);
  const [keyword, setKeyword] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-data-dict", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDicts(data?.data?.dicts ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const search = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const url = keyword
        ? `/api/v1/emr-qc-data-dict?keyword=${encodeURIComponent(keyword)}`
        : "/api/v1/emr-qc-data-dict";
      const resp = await fetch(url, {
        headers: { Authorization: token ? `Bearer ${token}` : "" },
      });
      if (resp.ok) {
        const data = await resp.json();
        setDicts(data?.data?.dicts ?? []);
      }
    } catch {
      message.error("搜索失败");
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控数据字典管理</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 300 }}
            placeholder="输入关键词搜索字典"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onPressEnter={search}
            addonAfter={<a onClick={search}>搜索</a>}
          />
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="数据字典列表">
          <List
            dataSource={dicts}
            renderItem={(dict) => (
              <List.Item>
                <Text strong style={{ width: 120 }}>{dict.category}</Text>
                <div>
                  {dict.items.map((item) => (
                    <Tag key={item} color={VI.accent} style={{ marginBottom: 4 }}>
                      {item}
                    </Tag>
                  ))}
                </div>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
