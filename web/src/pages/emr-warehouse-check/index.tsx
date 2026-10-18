/**
 * 健澜科技 jlmedaios - 病历库房盘点前端页（M541-D，V14，EMR 深化四模块，M541 收官）
 *
 * 深海蓝VI：病历库房盘点（库房名/盘点日期/应有数/实有数/差值/状态）。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Button, Card, Input, Layout, Statistic, Tag, Typography, message } from "antd";

const { Content } = Layout;
const { Title, Text } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface WarehouseCheck {
  warehouseName: string;
  checkDate: string;
}

interface CheckResult {
  diff: number;
  status: string;
}

interface CheckReport {
  diff: number;
  status: string;
}

const statusColor = (status: string): string => {
  if (status === "账实相符") return "green";
  if (status === "轻微差异") return "orange";
  return "red";
};

export default function EmrWarehouseCheckPage() {
  const [base, setBase] = useState<WarehouseCheck | null>(null);
  const [expectedCount, setExpectedCount] = useState(1000);
  const [actualCount, setActualCount] = useState(1000);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [report, setReport] = useState<CheckReport | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchBase = async () => {
      try {
        const token = localStorage.getItem("token") ?? "";
        const resp = await fetch("/api/v1/emr-warehouse-check", {
          headers: { Authorization: token ? `Bearer ${token}` : "" },
        });
        if (resp.ok) {
          const data = await resp.json();
          setBase(data?.data ?? null);
        }
      } catch {
        message.error("加载库房盘点基础数据失败");
      }
    };
    void fetchBase();
  }, []);

  const doStocktake = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("token") ?? "";
      const resp = await fetch("/api/v1/emr-warehouse-check", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: token ? `Bearer ${token}` : "",
        },
        body: JSON.stringify({ expectedCount, actualCount }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setResult(data?.data?.result ?? null);
        setReport(data?.data?.report ?? null);
        message.success("盘点完成");
      } else {
        message.error("盘点失败");
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
        <Title level={3} style={{ color: VI.deep }}>病历库房盘点</Title>
        {base && (
          <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="基础数据">
            <div>
              <Text strong>库房名：</Text><Text style={{ marginRight: 24 }}>{base.warehouseName}</Text>
              <Text strong>盘点日期：</Text><Tag color="blue">{base.checkDate}</Tag>
            </div>
          </Card>
        )}
        <Card style={{ marginBottom: 16 }} headStyle={{ background: VI.mid, color: "#fff" }} title="盘点输入">
          <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
            <div>
              <Text strong>应有数：</Text>
              <Input
                type="number"
                value={expectedCount}
                onChange={(e) => setExpectedCount(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
            <div>
              <Text strong>实有数：</Text>
              <Input
                type="number"
                value={actualCount}
                onChange={(e) => setActualCount(Number(e.target.value))}
                style={{ width: 140, marginLeft: 8 }}
              />
            </div>
          </div>
          <Button type="primary" style={{ background: VI.accent }} loading={loading} onClick={doStocktake}>
            执行盘点
          </Button>
        </Card>
        {result && report && (
          <Card headStyle={{ background: VI.mid, color: "#fff" }} title="盘点结果">
            <div style={{ display: "flex", alignItems: "center", gap: 32 }}>
              <Statistic title="差值（实有-应有）" value={report.diff} />
              <div>
                <Text strong>状态：</Text>
                <Tag color={statusColor(report.status)} style={{ marginLeft: 8, fontSize: 16 }}>
                  {report.status}
                </Tag>
              </div>
            </div>
          </Card>
        )}
      </Content>
    </Layout>
  );
}
