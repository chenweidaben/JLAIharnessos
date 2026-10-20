/**
 * 健澜科技 jlmedaios - 麻醉记录管理 V13 页（M426-B，换名避让旧版 anesthesiaComplicationV13（M339））
 *
 * Copyright (c) 2026 杭州健澜科技有限公司
 */
import { useEffect, useState } from "react";
import { Card, Col, Empty, Layout, Row, Spin, Statistic, Table, Tag, Typography } from "antd";
import { get } from "@/services/request";

const { Content } = Layout;
const { Title } = Typography;
const VI = { deep: "#0A2540", mid: "#1E5F8C", accent: "#4A90D9", bg: "#f5f7fa" };

interface Resp {
  anesthesiaRecordCompleteRate: number;
  anesthesiaRecordTimelyRate: number;
  anesthesiaRecordPassRate: number;
}

export default function AnesthesiaRecordMgmtPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/anesthesia-record-mgmt");
        if (!cancelled) setData(resp);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);
  return (
    <Layout style={{ minHeight: "100vh", background: VI.bg }}>
      <Content style={{ padding: 24, maxWidth: 1024, margin: "0 auto" }}>
        <Title level={3} style={{ color: VI.deep }}>麻醉记录管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="麻醉记录完整率" value={data.anesthesiaRecordCompleteRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="麻醉记录及时率" value={data.anesthesiaRecordTimelyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="麻醉记录合格率" value={data.anesthesiaRecordPassRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
        {/* v5.0试点扩展（M208薄页补表）：今日麻醉记录 demo */}
        <Card style={{ marginTop: 16 }} title="今日麻醉记录">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={[
              { id: 1, patient: "张*三", op: "腹腔镜胆囊切除", anesthetist: "陈麻醉", duration: "1h20m", status: "已完成" },
              { id: 2, patient: "李*四", op: "阑尾切除", anesthetist: "王麻醉", duration: "45m", status: "已完成" },
              { id: 3, patient: "王*五", op: "膝关节置换", anesthetist: "李麻醉", duration: "2h10m", status: "进行中" },
              { id: 4, patient: "赵*六", op: "白内障超声乳化", anesthetist: "周麻醉", duration: "25m", status: "已完成" },
              { id: 5, patient: "钱*七", op: "剖宫产", anesthetist: "陈麻醉", duration: "50m", status: "已完成" },
            ]}
            columns={[
              { title: "患者", dataIndex: "patient" },
              { title: "手术名称", dataIndex: "op" },
              { title: "麻醉医师", dataIndex: "anesthetist" },
              { title: "时长", dataIndex: "duration" },
              { title: "状态", dataIndex: "status", render: (s: string) => <Tag color={s === "已完成" ? "green" : "blue"}>{s}</Tag> },
            ]}
            locale={{ emptyText: <Empty description="暂无麻醉记录" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
