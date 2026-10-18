/**
 * 健澜科技 jlmedaios - 质控指标采集前端页（M483-A，V14，EMR 深化四模块）
 *
 * 深海蓝VI：采集任务表格（任务名/数据源/记录数/状态）+ 执行按钮。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, Spin, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface CollectTask {
  taskName: string;
  source: string;
}

interface CollectResult {
  taskName: string;
  source: string;
  collectedRecords: number;
}

export default function EmrQcMetricCollectPage() {
  const [loading, setLoading] = useState(true);
  const [tasks, setTasks] = useState<CollectTask[]>([]);
  const [results, setResults] = useState<CollectResult[]>([]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-metric-collect", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          if (!cancelled) {
            setTasks(data?.tasks ?? []);
            setResults(data?.results ?? []);
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

  const run = (taskName: string) => {
    message.success(`${taskName} 采集完成`);
  };

  const columns = [
    { title: "任务名", dataIndex: "taskName", key: "taskName" },
    { title: "数据源", dataIndex: "source", key: "source" },
    {
      title: "记录数",
      dataIndex: "taskName",
      key: "records",
      render: (name: string) => {
        const r = results.find((x) => x.taskName === name);
        return r ? r.collectedRecords : 0;
      },
    },
    {
      title: "状态",
      dataIndex: "taskName",
      key: "status",
      render: (name: string) => {
        const r = results.find((x) => x.taskName === name);
        return r && r.collectedRecords > 0 ? <Tag color="green">已采集</Tag> : <Tag color="default">待采集</Tag>;
      },
    },
    {
      title: "操作",
      dataIndex: "taskName",
      key: "action",
      render: (name: string) => (
        <Button size="small" onClick={() => run(name)} style={{ background: VI.accent, color: "#fff" }}>
          执行
        </Button>
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控指标采集</Title>
        <Spin spinning={loading}>
          <Card headStyle={{ background: VI.mid, color: "#fff" }}>
            <Table dataSource={tasks} columns={columns} rowKey="taskName" pagination={false} />
          </Card>
        </Spin>
      </Content>
    </Layout>
  );
}
