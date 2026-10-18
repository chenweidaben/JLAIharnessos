/**
 * 健澜科技 jlmedaios - 质控数据字典管理明细前端页（M507-C，V14，EMR 深化四模块，-detail 避让）
 *
 * 深海蓝VI：数据字典列表（类型/编码/标签）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DataDict {
  type: string;
  code: string;
  label: string;
}

export default function EmrQcDataDictDetailPage() {
  const [dicts, setDicts] = useState<DataDict[]>([]);
  const [type, setType] = useState("");
  const [code, setCode] = useState("");
  const [label, setLabel] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-data-dict-detail", {
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

  const addDict = async () => {
    if (!type.trim() || !code.trim()) {
      message.warning("请输入类型和编码");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-data-dict-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ type, code, label }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setDicts(data?.data?.dicts ?? []);
        setType("");
        setCode("");
        setLabel("");
        message.success("添加成功");
      } else {
        message.error("添加失败");
      }
    } catch {
      message.error("网络错误");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>数据字典管理</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="添加字典">
          <Form layout="inline">
            <Form.Item label="类型">
              <Input placeholder="类型" value={type} onChange={(e) => setType(e.target.value)} />
            </Form.Item>
            <Form.Item label="编码">
              <Input placeholder="编码" value={code} onChange={(e) => setCode(e.target.value)} />
            </Form.Item>
            <Form.Item label="标签">
              <Input placeholder="标签" value={label} onChange={(e) => setLabel(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={addDict}>
                添加
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`字典列表（共 ${dicts.length} 条）`}>
          <List
            dataSource={dicts}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 140, color: VI.deep }}>{item.type}</Text>
                <Tag color={VI.accent} style={{ width: 140 }}>{item.code}</Tag>
                <Text type="secondary">{item.label}</Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
