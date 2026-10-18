/**
 * 健澜科技 jlmedaios - 病案首页质控前端页（M480-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：首页字段表格（必填项）+ 缺失项红色 + 得分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, Spin, Switch, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const defaultFields = [
  { key: "name", name: "姓名", filled: true },
  { key: "gender", name: "性别", filled: true },
  { key: "age", name: "年龄", filled: true },
  { key: "primaryDx", name: "主诊断", filled: true },
  { key: "admitDate", name: "入院日期", filled: false },
  { key: "dischargeDate", name: "出院日期", filled: false },
];

export default function EmrFrontPageQcPage() {
  const [fields, setFields] = useState(defaultFields);
  const [score, setScore] = useState<number | null>(null);
  const [missing, setMissing] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const check = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-front-page-qc", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ fields: fields.map((f) => ({ name: f.name, filled: f.filled })) }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setScore(data?.score ?? null);
        setMissing(data?.result?.missingFields ?? []);
      }
    } catch {
      message.error("校验失败");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "字段", dataIndex: "name", key: "name" },
    {
      title: "是否填写",
      dataIndex: "filled",
      key: "filled",
      render: (filled: boolean, record: { key: string; name: string }) => (
        <Switch
          checked={filled}
          onChange={(checked) =>
            setFields((prev) => prev.map((f) => (f.key === record.key ? { ...f, filled: checked } : f)))
          }
        />
      ),
    },
    {
      title: "状态",
      dataIndex: "filled",
      key: "status",
      render: (filled: boolean) =>
        filled ? <Tag color="green">已填</Tag> : <Tag color="red">缺失</Tag>,
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病案首页质控</Title>
        <Spin spinning={loading}>
          <Card title="首页必填项" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            <Table dataSource={fields} columns={columns} rowKey="key" pagination={false} />
            <Button type="primary" onClick={check} style={{ background: VI.accent, marginTop: 16 }}>
              校验
            </Button>
          </Card>
          {score !== null && (
            <Card title="校验结果" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Text strong>得分：</Text>
              <Text style={{ color: VI.accent, fontSize: 24, marginLeft: 8 }}>{score}</Text>
              {missing.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <Text strong>缺失项：</Text>
                  {missing.map((m) => (
                    <Tag color="red" key={m} style={{ marginLeft: 8 }}>{m}</Tag>
                  ))}
                </div>
              )}
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
