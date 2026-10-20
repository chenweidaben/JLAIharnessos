/**
 * 健澜科技 jlmedaios - 病案管理 V13 页（M401-A）
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
  medicalRecordArchivingTimelyRate: number;
  medicalRecordGradeARate: number;
  medicalRecordFrontPagePassRate: number;
}

export default function MedicalRecordPage() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<Resp | null>(null);
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const resp = await get<Resp>("/api/v1/medical-record");
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
        <Title level={3} style={{ color: VI.deep }}>病案管理</Title>
        {loading && <Spin size="large" style={{ padding: 48 }} />}
        {!loading && data && (
          <Row gutter={16}>
            <Col span={8}>
              <Card>
                <Statistic title="病案归档及时率" value={data.medicalRecordArchivingTimelyRate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="病案甲级率" value={data.medicalRecordGradeARate} suffix="%" precision={2} />
              </Card>
            </Col>
            <Col span={8}>
              <Card>
                <Statistic title="病案首页合格率" value={data.medicalRecordFrontPagePassRate} suffix="%" precision={2} />
              </Card>
            </Col>
          </Row>
        )}
        {/* v5.0试点扩展（M208薄页补表）：近期病案列表 demo */}
        <Card style={{ marginTop: 16 }} title="近期病案列表">
          <Table
            rowKey="id"
            size="small"
            pagination={false}
            dataSource={[
              { id: 1, mrn: "MR20261001", patient: "张*三", dept: "心内科", grade: "甲级", status: "已归档" },
              { id: 2, mrn: "MR20261002", patient: "李*四", dept: "呼吸科", grade: "乙级", status: "已归档" },
              { id: 3, mrn: "MR20261003", patient: "王*五", dept: "普外科", grade: "甲级", status: "待质控" },
              { id: 4, mrn: "MR20261004", patient: "赵*六", dept: "神经外科", grade: "甲级", status: "已归档" },
              { id: 5, mrn: "MR20261005", patient: "钱*七", dept: "骨科", grade: "丙级", status: "退回修改" },
            ]}
            columns={[
              { title: "病案号", dataIndex: "mrn" },
              { title: "患者", dataIndex: "patient" },
              { title: "科室", dataIndex: "dept" },
              { title: "等级", dataIndex: "grade", render: (g: string) => <Tag color={g === "甲级" ? "green" : g === "乙级" ? "orange" : "red"}>{g}</Tag> },
              { title: "状态", dataIndex: "status" },
            ]}
            locale={{ emptyText: <Empty description="暂无病案数据" /> }}
          />
        </Card>
      </Content>
    </Layout>
  );
}
