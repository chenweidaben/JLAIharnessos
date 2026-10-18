/**
 * 健澜科技 jlmedaios - 病历时效性检查前端页（M476-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：时限合规表格（病历类型/规定时限/实际耗时/状态绿√红✗）+ 超时红色标记。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useState } from "react";
import { Button, Card, Layout, List, Spin, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

const initialRecords = [
  { name: "入院记录", deadlineHours: 24, actualHours: 20 },
  { name: "首次病程", deadlineHours: 8, actualHours: 10 },
  { name: "出院记录", deadlineHours: 48, actualHours: 36 },
];

export default function EmrTimelinessCheckPage() {
  const [loading, setLoading] = useState(false);
  const [overdueItems, setOverdueItems] = useState<string[]>([]);
  const [score, setScore] = useState<number | null>(null);

  const runCheck = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-timeliness-check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ records: initialRecords }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setOverdueItems(data?.result?.overdueItems ?? []);
        setScore(data?.result?.score ?? null);
        message.success("时效性检查完成");
      }
    } catch {
      message.error("请求失败");
    } finally {
      setLoading(false);
    }
  };

  const columns = [
    { title: "病历类型", dataIndex: "name", key: "name" },
    { title: "规定时限(小时)", dataIndex: "deadlineHours", key: "deadlineHours" },
    { title: "实际耗时(小时)", dataIndex: "actualHours", key: "actualHours" },
    {
      title: "状态",
      key: "status",
      render: (_: unknown, record: { deadlineHours: number; actualHours: number }) => {
        const ok = record.actualHours <= record.deadlineHours;
        return ok ? <Tag color="green">√ 合规</Tag> : <Tag color="red">✗ 超时</Tag>;
      },
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>病历时效性检查</Title>
        <Card style={{ marginBottom: 16 }}>
          <Table dataSource={initialRecords} columns={columns} rowKey="name" pagination={false} />
          <Button type="primary" onClick={runCheck} style={{ background: VI.accent, marginTop: 16 }}>
            开始检查
          </Button>
        </Card>
        <Spin spinning={loading}>
          <Card title="超时列表" headStyle={{ background: VI.mid, color: "#fff" }} style={{ marginBottom: 16 }}>
            {overdueItems.length === 0 ? (
              <Text type="secondary">无超时</Text>
            ) : (
              <List
                dataSource={overdueItems}
                renderItem={(item: string) => (
                  <List.Item>
                    <Tag color="red">{item}</Tag>
                  </List.Item>
                )}
              />
            )}
          </Card>
          {score !== null && (
            <Card title="时效性得分" headStyle={{ background: VI.mid, color: "#fff" }}>
              <Title level={2} style={{ color: score >= 90 ? "#52c41a" : score >= 60 ? VI.accent : "#f5222d", margin: 0 }}>
                {score} 分
              </Title>
            </Card>
          )}
        </Spin>
      </Content>
    </Layout>
  );
}
