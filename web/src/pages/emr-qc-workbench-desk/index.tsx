/**
 * 健澜科技 jlmedaios - 病历质控质控员工作台前端页（M474-A，-desk 后缀避让，V14，EMR 深化四模块）
 *
 * 深海蓝VI：三栏统计卡片（待审/在审/已审）+ 待审列表表格。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Layout, Row, Spin, Table, Tag, Typography } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface WorkbenchStats {
  pending: number;
  inProgress: number;
  reviewed: number;
  total: number;
}

interface PendingNote {
  id: string;
  patientName: string;
  dept: string;
  submittedAt: string;
}

export default function EmrQcWorkbenchDeskPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<WorkbenchStats>({ pending: 0, inProgress: 0, reviewed: 0, total: 0 });
  const [pendingList, setPendingList] = useState<PendingNote[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-workbench-desk", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setStats(data?.stats ?? { pending: 0, inProgress: 0, reviewed: 0, total: 0 });
            setPendingList(data?.pendingList ?? []);
          }
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
    { title: "患者姓名", dataIndex: "patientName", key: "patientName" },
    { title: "科室", dataIndex: "dept", key: "dept", render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: "提交时间", dataIndex: "submittedAt", key: "submittedAt" },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控员工作台</Title>
        <Spin spinning={loading}>
          <Row gutter={16} style={{ marginBottom: 16 }}>
            <Col span={6}>
              <Card>
                <Text type="secondary">待审</Text>
                <Title level={2} style={{ color: "#fa8c16", margin: 0 }}>{stats.pending}</Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Text type="secondary">在审</Text>
                <Title level={2} style={{ color: VI.accent, margin: 0 }}>{stats.inProgress}</Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Text type="secondary">已审</Text>
                <Title level={2} style={{ color: "#52c41a", margin: 0 }}>{stats.reviewed}</Title>
              </Card>
            </Col>
            <Col span={6}>
              <Card>
                <Text type="secondary">总计</Text>
                <Title level={2} style={{ color: VI.deep, margin: 0 }}>{stats.total}</Title>
              </Card>
            </Col>
          </Row>
          <Card title="待审病历列表（按提交时间降序）" headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={pendingList} columns={columns} rowKey="id" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
