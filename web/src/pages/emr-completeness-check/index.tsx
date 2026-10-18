/**
 * 健澜科技 jlmedaios - 病历完整性检查前端页（M476-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历字段检查表单（checkbox 已填写状态）+ 缺失项列表 + 得分。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Checkbox, Layout, List, Spin, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const initialFields = [
  { name: "姓名", filled: true },
  { name: "性别", filled: true },
  { name: "年龄", filled: true },
  { name: "主诉", filled: false },
  { name: "现病史", filled: false },
];

export default function EmrCompletenessCheckPage() {
  const [fields, setFields] = useState(initialFields);
  const [loading, setLoading] = useState(false);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const toggle = (name: string) => {
    setFields((prev) => prev.map((f) => (f.name === name ? { ...f, filled: !f.filled } : f)));
  };

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-completeness-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ fields }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setMissingFields(data?.result?.missingFields ?? []);
        setScore(data?.score ?? null);
        message.success("完整性检查完成");
      }
    } catch {
      message.error("请求失败");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历完整性检查</Title>
        <Card title="病历字段填写状态" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          <Spin spinning={loading}>
            {fields.map((f) => (
              <Checkbox
                key={f.name}
                checked={f.filled}
                onChange={() => toggle(f.name)}
                style={{ marginRight: 24, marginBottom: 8 }}
              >
                {f.name}
              </Checkbox>
            ))}
            <div style={{ marginTop: 16 }}>
              <Button type="primary" onClick={runCheck} style={{ background: VI.accent }}>
                开始检查
              </Button>
            </div>
          </Spin>
        </Card>
        <Card title="缺失项列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
          {missingFields.length === 0 ? (
            <Text type="secondary">无缺失字段</Text>
          ) : (
            <List
              dataSource={missingFields}
              renderItem={(item: string) => (
                <List.Item>
                  <Tag color="red">{item}</Tag>
                </List.Item>
              )}
            />
          )}
        </Card>
        {score !== null && (
          <Card title="完整性得分" headStyle={{ background: VI.mid, color: "#fff" }}>
            <Title level={2} style={{ color: score >= 90 ? "#52c41a" : score >= 60 ? VI.accent : "#f5222d", margin: 0 }}>
              {score} 分
            </Title>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
