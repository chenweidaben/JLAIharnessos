/**
 * 健澜科技 jlmedaios - 质控系统参数配置前端页（M498-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：系统参数配置表（参数名/参数值）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Table, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface SysParam {
  key: string;
  value: string;
}

interface Validation {
  valid: boolean;
  errors: string[];
}

export default function EmrQcSysParamPage() {
  const [params, setParams] = useState<SysParam[]>([]);
  const [newKey, setNewKey] = useState("");
  const [newValue, setNewValue] = useState("");
  const [validation, setValidation] = useState<Validation | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-sys-param", {
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

  const submit = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-sys-param", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ key: newKey, value: newValue }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setValidation(data?.data?.validation ?? null);
        if (data?.data?.validation?.valid) {
          setParams((prev) => [...prev, data?.data?.param]);
          message.success("参数提交完成");
          setNewKey("");
          setNewValue("");
        }
      }
    } catch {
      message.error("参数提交失败");
    }
  };

  const columns = [
    { title: "参数名", dataIndex: "key", key: "key" },
    { title: "参数值", dataIndex: "value", key: "value" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控系统参数配置</Title>
        <Card style={{ marginBottom: 16 }}>
          <Input
            style={{ width: 250 }}
            placeholder="参数名"
            value={newKey}
            onChange={(e) => setNewKey(e.target.value)}
          />
          <Input
            style={{ width: 250, marginLeft: 8 }}
            placeholder="参数值"
            value={newValue}
            onChange={(e) => setNewValue(e.target.value)}
          />
          <Button type="primary" onClick={submit} style={{ background: VI.accent, marginLeft: 16 }}>
            添加参数
          </Button>
          {validation && !validation.valid && (
            <div style={{ marginTop: 8 }}>
              {validation.errors.map((err, i) => (
                <Text key={i} type="danger">{err}</Text>
              ))}
            </div>
          )}
        </Card>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="参数列表">
          <Table columns={columns} dataSource={params} rowKey="key" pagination={false} />
        </Card>
      </Content>
    </Layout>
  );
}
