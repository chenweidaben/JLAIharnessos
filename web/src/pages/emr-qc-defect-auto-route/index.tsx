/**
 * 健澜科技 jlmedaios - 病历缺陷自动分发前端页（M521-C，V14，EMR 深化四模块）
 *
 * 深海蓝VI：病历缺陷自动分发（缺陷ID/科室/缺陷类型/处理人列表/分发结果/是否匹配）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Layout, List, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface DefectAutoRoute {
  defectId: string;
  dept: string;
  defectType: string;
}

interface RouteResult {
  routedTo: string;
  matched: boolean;
}

interface RouteReport {
  routedTo: string;
  matched: boolean;
}

const DEFAULT_HANDLERS = [
  { type: "时限类", handler: "王质控" },
  { type: "完整性类", handler: "李质控" },
];

export default function EmrQcDefectAutoRoutePage() {
  const [defect, setDefect] = useState<DefectAutoRoute | null>(null);
  const [handlers] = useState(DEFAULT_HANDLERS);
  const [result, setResult] = useState<RouteResult | null>(null);
  const [report, setReport] = useState<RouteReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchDefect = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-defect-auto-route", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setDefect(data?.data ?? null);
        }
      } catch {
        message.error("加载缺陷分发基础数据失败");
      }
    };
    void fetchDefect();
  }, []);

  const doRoute = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-defect-auto-route", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ handlers }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("分发完成");
      } else {
        message.error("分发失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历缺陷自动分发</Title>
        {defect && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="缺陷分发基础数据">
            <div>
              <Text strong>缺陷ID：</Text><Text style={{ marginRight: 24 }}>{defect.defectId}</Text>
              <Text strong>科室：</Text><Text style={{ marginRight: 24 }}>{defect.dept}</Text>
              <Text strong>缺陷类型：</Text>
              <Tag color={VI.accent}>{defect.defectType}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="处理人列表">
          <List
            dataSource={handlers}
            renderItem={(item) => (
              <List.Item>
                <Tag color="blue">{item.type}</Tag>
                <Text style={{ marginLeft: 16 }}>{item.handler}</Text>
              </List.Item>
            )}
          />
          <Button type="primary" style={{ background: VI.accent, marginTop: 16 }} loading={loading} onClick={doRoute}>
            自动分发
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="分发结果">
            <div style={{ marginBottom: 16 }}>
              <Text strong>分发至：</Text>
              <Tag color="green" style={{ marginLeft: 8, fontSize: 16 }}>{report.routedTo}</Tag>
            </div>
            <div>
              <Text strong>是否匹配：</Text>
              <Tag color={report.matched ? "green" : "orange"} style={{ marginLeft: 8 }}>
                {report.matched ? "是" : "否（默认质控办）"}
              </Tag>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
