/**
 * 健澜科技 jlmedaios - 质控系统参数配置明细前端页（M507-A，V14，EMR 深化四模块，-detail 避让）
 *
 * 深海蓝VI：系统参数配置列表（参数名/参数值/描述）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Form, Input, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SysParam {
  key: string;
  value: string;
  desc: string;
}

export default function EmrQcSysParamDetailPage() {
  const [params, setParams] = useState<SysParam[]>([]);
  const [key, setKey] = useState("");
  const [value, setValue] = useState("");
  const [desc, setDesc] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-sys-param-detail", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setParams(data?.data?.params ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const saveParam = async () => {
    if (!key.trim()) {
      message.warning("请输入参数名");
      return;
    }
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-sys-param-detail", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ key, value, desc }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setParams(data?.data?.params ?? []);
        setKey("");
        setValue("");
        setDesc("");
        message.success("保存成功");
      } else {
        message.error("保存失败");
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
        <Title level={3} style={{ color: VI.deep }}>系统参数配置</Title>
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="设置参数">
          <Form layout="inline">
            <Form.Item label="参数名">
              <Input placeholder="参数名" value={key} onChange={(e) => setKey(e.target.value)} />
            </Form.Item>
            <Form.Item label="参数值">
              <Input placeholder="参数值" value={value} onChange={(e) => setValue(e.target.value)} />
            </Form.Item>
            <Form.Item label="描述">
              <Input placeholder="描述" value={desc} onChange={(e) => setDesc(e.target.value)} />
            </Form.Item>
            <Form.Item>
              <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={saveParam}>
                保存
              </Button>
            </Form.Item>
          </Form>
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title={`参数列表（共 ${params.length} 条）`}>
          <List
            dataSource={params}
            renderItem={(item) => (
              <List.Item>
                <Text strong style={{ width: 200, color: VI.deep }}>{item.key}</Text>
                <Tag color={VI.accent} style={{ width: 80 }}>{item.value}</Tag>
                <Text type="secondary">{item.desc}</Text>
              </List.Item>
            )}
          />
        </Card>
      </Content>
    </Layout>
  );
}
