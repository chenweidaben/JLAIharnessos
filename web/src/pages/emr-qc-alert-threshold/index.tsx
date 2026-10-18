/**
 * 健澜科技 jlmedaios - 质控科室预警阈值前端页（M495-B，V14，EMR 深化四模块）
 *
 * 深海蓝VI：预警阈值配置表（科室/指标/阈值 Slider）+ 触发状态。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Slider, Table, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface AlertThreshold {
  dept: string;
  metric: string;
  threshold: number;
}

interface AlertCheckResult {
  dept: string;
  metric: string;
  actual: number;
  threshold: number;
  alerted: boolean;
}

export default function EmrQcAlertThresholdPage() {
  const [thresholds, setThresholds] = useState<AlertThreshold[]>([]);
  const [actualInput, setActualInput] = useState("8");
  const [checkResult, setCheckResult] = useState<AlertCheckResult | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-qc-alert-threshold", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setThresholds(data?.data?.thresholds ?? []);
        }
      } catch {
        message.error("加载失败");
      }
    };
    void fetchData();
  }, []);

  const check = async () => {
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-qc-alert-threshold/check", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: token ? `Bearer ${token}` : "" },
        body: JSON.stringify({ dept: "内科", metric: "缺陷率", actual: Number(actualInput) || 0, threshold: 5 }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setCheckResult(data?.data?.result ?? null);
        message.success("阈值检查完成");
      }
    } catch {
      message.error("阈值检查失败");
    }
  };

  const columns = [
    { title: "科室", dataIndex: "dept", key: "dept" },
    { title: "指标", dataIndex: "metric", key: "metric" },
    {
      title: "阈值",
      dataIndex: "threshold",
      key: "threshold",
      render: (threshold: number) => (
        <Slider defaultValue={threshold} max={20} style={{ width: 200 }} />
      ),
    },
  ];

  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1280, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>质控科室预警阈值</Title>
        <Card headStyle={{ background: VI.mid, color: "#fff" }} title="阈值配置">
          <Table columns={columns} dataSource={thresholds} rowKey="dept" pagination={false} />
        </Card>
        <Card style={{ marginTop: 16 }} title="阈值检查">
          <Text>实际值：</Text>
          <Input
            style={{ width: 120, marginLeft: 8 }}
            value={actualInput}
            onChange={(e) => setActualInput(e.target.value)}
          />
          <Button type="primary" onClick={check} style={{ background: VI.accent, marginLeft: 16 }}>
            检查
          </Button>
          {checkResult && (
            <div style={{ marginTop: 16 }}>
              <Text strong>触发状态：</Text>
              <Tag color={checkResult.alerted ? "red" : "green"}>
                {checkResult.alerted ? "已触发预警" : "正常"}
              </Tag>
              <Text style={{ marginLeft: 16 }}>
                实际 {checkResult.actual} / 阈值 {checkResult.threshold}
              </Text>
            </div>
          )}
        </Card>
      </Content>
    </Layout>
  );
}
