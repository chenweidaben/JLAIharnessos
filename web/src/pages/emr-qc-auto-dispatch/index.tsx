/**
 * 健澜科技 jlmedaios - 病历质控自动派单前端页（M521-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历质控自动派单（记录ID/科室/缺陷级别/派单人员/当前工作量/派单后工作量）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AutoDispatch {
  recordId: string;
  dept: string;
  defectLevel: string;
}

interface DispatchResult {
  assignedTo: string;
  workload: number;
}

interface DispatchReport {
  assignedTo: string;
  workload: number;
}

const DEFAULT_ASSIGNEES = [
  { name: "张医生", workload: 5 },
  { name: "李医生", workload: 3 },
];

export default function EmrQcAutoDispatchPage() {
  const [dispatch, setDispatch] = useState<AutoDispatch | null>(null);
  const [assignees] = useState(DEFAULT_ASSIGNEES);
  const [result, setResult] = useState<DispatchResult | null>(null);
  const [report, setReport] = useState<DispatchReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDispatch = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-auto-dispatch", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDispatch(data?.data ?? null);
        }
      } catch {
        message.error("加载派单基础数据失败");
      }
    };
    void fetchDispatch();
  }, []);

  const doDispatch = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-auto-dispatch", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ assignees }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("派单完成");
      } else {
        message.error("派单失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历质控自动派单</Title>
        {dispatch && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="派单基础数据">
            <div>
              <Text strong>记录ID：</Text><Text style={{ marginRight: 24 }}>{dispatch.recordId}</Text>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{dispatch.dept}</Text>
              <Text strong>缺陷级别：</Text>
              <Tag color={dispatch.defectLevel === "block" ? "red" : dispatch.defectLevel === "major" ? "orange" : "blue"}>
                {dispatch.defectLevel}
              </Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="候选派单人员">
          <List
            dataSource={assignees}
            renderItem={(item) => (
              <List.Item>
                <Text>{item.name}</Text>
                <Text style={{ marginLeft: 16 }}>当前工作量：{item.workload}</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doDispatch}>
            自动派单
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="派单结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>派单人员：</Text>
              <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.assignedTo}</Tag>
            </div>
            <div>
              <Text strong>派单后工作量：</Text>
              <Text style={{ marginLeft: 8 }}>{report.workload}</Text>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
