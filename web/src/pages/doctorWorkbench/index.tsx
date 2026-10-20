/**
 * 健澜科技 jlmedaios - 医生站工作台页（M79-A）
 *
 * 首页工作台卡片：待办/告警/随访/KPI 红黄 Tag。
 * v5.0试点扩展（M190三角色工作流）：
 *  - 补 待诊患者队列 / 今日手术安排 / 待审医嘱汇总 三块 DEMO mock（每块 6 条）；
 *  - 待诊患者"开医嘱"触发患者过敏史提醒弹窗（mock 2 条过敏记录），开方前强制核对。
 * 待后端聚合器接入真实队列后，前端 mock 可平滑替换。
 * Copyright (c) 杭州健澜科技有限公司
 */
import { useEffect, useState } from 'react';
import {
  Alert,
  Badge,
  Button,
  Card,
  Col,
  Descriptions,
  Layout,
  Modal,
  Row,
  Statistic,
  Table,
  Tag,
  Typography,
} from 'antd';
import { usePermission } from '@/router/guards';
import { useDoctorWorkbenchStore } from '@/store/doctorWorkbenchStore';
import { riskTag } from '@/utils/doctorWorkbench';

const { Header, Content } = Layout;
const { Title } = Typography;

/* ------------------------------------------------------------------ */
/* v5.0试点扩展（M190三角色工作流）：DEMO mock 数据                     */
/* ------------------------------------------------------------------ */
interface WaitingPatient {
  id: string;
  name: string;
  gender: string;
  age: number;
  dept: string;
  chiefComplaint: string;
  waitMin: number;
  priority: '普通' | '加急';
}

interface SurgeryItem {
  time: string;
  patient: string;
  surgery: string;
  room: string;
  surgeon: string;
  status: string;
}

interface PendingOrderItem {
  orderNo: string;
  patient: string;
  orderType: '长期医嘱' | '临时医嘱';
  content: string;
  requester: string;
  pendingMin: number;
}

interface AllergyRecord {
  allergen: string;
  reaction: string;
  severity: '高' | '中' | '低';
}

/** 待诊患者队列（DEMO mock，6 条） */
const WAITING_QUEUE: WaitingPatient[] = [
  { id: 'OPD-1001', name: '王建国', gender: '男', age: 58, dept: '心内科', chiefComplaint: '胸闷胸痛3天', waitMin: 25, priority: '普通' },
  { id: 'OPD-1002', name: '李秀英', gender: '女', age: 63, dept: '呼吸内科', chiefComplaint: '咳嗽咳痰伴气促5天', waitMin: 40, priority: '普通' },
  { id: 'OPD-1003', name: '张伟', gender: '男', age: 45, dept: '消化内科', chiefComplaint: '反复上腹痛1周', waitMin: 18, priority: '加急' },
  { id: 'OPD-1004', name: '陈桂兰', gender: '女', age: 71, dept: '神经内科', chiefComplaint: '头晕伴右侧肢体乏力2天', waitMin: 55, priority: '加急' },
  { id: 'OPD-1005', name: '刘洋', gender: '男', age: 34, dept: '内分泌科', chiefComplaint: '多饮多尿2月', waitMin: 12, priority: '普通' },
  { id: 'OPD-1006', name: '赵春芳', gender: '女', age: 52, dept: '肾内科', chiefComplaint: '眼睑及双下肢水肿10天', waitMin: 33, priority: '普通' },
];

/** 今日手术安排（DEMO mock，6 条） */
const TODAY_SURGERY: SurgeryItem[] = [
  { time: '08:30', patient: '孙明', surgery: '腹腔镜胆囊切除术', room: '手术间1', surgeon: '陈主任', status: '已接台' },
  { time: '09:30', patient: '周涛', surgery: '经皮冠状动脉支架置入术', room: 'DSA室', surgeon: '刘主任', status: '术前准备' },
  { time: '10:30', patient: '吴丽华', surgery: '全膝关节置换术', room: '手术间3', surgeon: '赵主任', status: '待麻醉' },
  { time: '13:30', patient: '郑强', surgery: '腹腔镜阑尾切除术', room: '手术间2', surgeon: '孙医师', status: '排台中' },
  { time: '14:30', patient: '冯丽', surgery: '甲状腺次全切除术', room: '手术间1', surgeon: '陈主任', status: '排台中' },
  { time: '15:30', patient: '何军', surgery: '腹股沟疝无张力修补术', room: '手术间4', surgeon: '周医师', status: '排台中' },
];

/** 待审医嘱汇总（DEMO mock，6 条） */
const PENDING_ORDERS: PendingOrderItem[] = [
  { orderNo: 'ORD-101', patient: '王建国', orderType: '长期医嘱', content: '阿司匹林肠溶片 100mg qd 口服', requester: '住院医 钱峰', pendingMin: 30 },
  { orderNo: 'ORD-102', patient: '李秀英', orderType: '临时医嘱', content: '血常规 + CRP 急查', requester: '住院医 冯洁', pendingMin: 15 },
  { orderNo: 'ORD-103', patient: '张伟', orderType: '长期医嘱', content: '奥美拉唑肠溶胶囊 20mg bid', requester: '主治 吴刚', pendingMin: 45 },
  { orderNo: 'ORD-104', patient: '陈桂兰', orderType: '临时医嘱', content: '头颅 CT 平扫', requester: '住院医 钱峰', pendingMin: 60 },
  { orderNo: 'ORD-105', patient: '刘洋', orderType: '长期医嘱', content: '二甲双胍缓释片 0.5g bid', requester: '主治 吴刚', pendingMin: 22 },
  { orderNo: 'ORD-106', patient: '赵春芳', orderType: '临时医嘱', content: '尿微量白蛋白 / 肌酐比', requester: '住院医 冯洁', pendingMin: 40 },
];

/** 过敏史记录（DEMO mock，2 条）——开医嘱前强制核对 */
const MOCK_ALLERGIES: AllergyRecord[] = [
  { allergen: '青霉素 G 钠', reaction: '躯干皮疹伴瘙痒（荨麻疹）', severity: '中' },
  { allergen: '磺胺类（复方磺胺甲噁唑）', reaction: '面部血管性水肿', severity: '高' },
];

export default function DoctorWorkbenchPage() {
  const { data, loading, error, load } = useDoctorWorkbenchStore();
  const [orderPatient, setOrderPatient] = useState<WaitingPatient | null>(null);
  usePermission();
  useEffect(() => { void load(); }, [load]);

  const kpiColumns = [
    { title: '科室', dataIndex: 'department', key: 'department' },
    { title: '院感率', dataIndex: 'infectionRate', key: 'infectionRate' },
    { title: 'DDDs', dataIndex: 'ddds', key: 'ddds' },
    { title: '风险', dataIndex: 'risk', key: 'risk',
      render: (v: string) => <Tag color={riskTag(v as 'red' | 'yellow' | 'green')}>{v}</Tag> },
  ];

  /* v5.0试点扩展（M190三角色工作流）：待诊患者队列列定义 */
  const waitingColumns = [
    { title: '序号', key: 'idx', width: 50, render: (_: unknown, __: WaitingPatient, i: number) => i + 1 },
    { title: '患者', dataIndex: 'name', key: 'name', render: (v: string) => <Tag color="blue">{v}</Tag> },
    { title: '性别/年龄', key: 'demo', render: (_: unknown, r: WaitingPatient) => `${r.gender} / ${r.age}岁` },
    { title: '科室', dataIndex: 'dept', key: 'dept' },
    { title: '主诉', dataIndex: 'chiefComplaint', key: 'cc' },
    { title: '候诊', dataIndex: 'waitMin', key: 'wait', render: (v: number) => <Tag color={v > 40 ? 'red' : 'default'}>{v} 分钟</Tag> },
    { title: '优先级', dataIndex: 'priority', key: 'pri',
      render: (v: string) => <Tag color={v === '加急' ? 'red' : 'default'}>{v}</Tag> },
    { title: '操作', key: 'act',
      render: (_: unknown, r: WaitingPatient) => (
        <Button size="small" type="link" onClick={() => setOrderPatient(r)}>开医嘱</Button>
      ) },
  ];

  /* v5.0试点扩展（M190三角色工作流）：今日手术安排列定义 */
  const surgeryColumns = [
    { title: '时间', dataIndex: 'time', key: 'time', render: (v: string) => <Tag color="geekblue">{v}</Tag> },
    { title: '患者', dataIndex: 'patient', key: 'patient' },
    { title: '手术名称', dataIndex: 'surgery', key: 'surgery' },
    { title: '手术间', dataIndex: 'room', key: 'room' },
    { title: '术者', dataIndex: 'surgeon', key: 'surgeon' },
    { title: '状态', dataIndex: 'status', key: 'status',
      render: (v: string) => <Tag color={v === '已接台' ? 'green' : v === '排台中' ? 'default' : 'orange'}>{v}</Tag> },
  ];

  /* v5.0试点扩展（M190三角色工作流）：待审医嘱列定义 */
  const pendingOrderColumns = [
    { title: '医嘱号', dataIndex: 'orderNo', key: 'no', render: (v: string) => <Tag>{v}</Tag> },
    { title: '患者', dataIndex: 'patient', key: 'patient' },
    { title: '类型', dataIndex: 'orderType', key: 'type',
      render: (v: string) => <Tag color={v === '临时医嘱' ? 'orange' : 'cyan'}>{v}</Tag> },
    { title: '内容', dataIndex: 'content', key: 'content' },
    { title: '开立人', dataIndex: 'requester', key: 'requester' },
    { title: '待审', dataIndex: 'pendingMin', key: 'pending',
      render: (v: number) => <Tag color={v > 45 ? 'red' : 'default'}>{v} 分钟</Tag> },
  ];

  return (
    <Layout className="jl-responsive" style={{ minHeight: '100vh' }}>
      <Header><Title level={4} style={{ color: '#fff' }}>医生站工作台</Title></Header>
      <Content style={{ padding: 24 }}>
        {error && <Alert type="error" showIcon style={{ marginBottom: 16 }} message={error} />}
        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="待办工单" value={data?.openTasksCount ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="未读通知" value={data?.unreadNotifications ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="急诊在观" value={data?.activeObservations ?? 0} /></Card></Col>
          <Col xs={24} sm={12} lg={6}><Card><Statistic title="待确认治疗方案" value={data?.pendingPlans ?? 0} /></Card></Col>
        </Row>

        {/* v5.0试点扩展（M190三角色工作流）：待诊患者队列 */}
        <Card
          size="small"
          style={{ marginBottom: 16 }}
          title={<Badge count={WAITING_QUEUE.length} size="small" offset={[8, 0]}><Title level={5} style={{ margin: 0 }}>待诊患者队列</Title></Badge>}
        >
          <Table
            rowKey="id"
            size="small"
            loading={loading}
            columns={waitingColumns}
            dataSource={WAITING_QUEUE}
            pagination={false}
          />
        </Card>

        <Row gutter={16} style={{ marginBottom: 16 }}>
          <Col xs={24} lg={12}>
            {/* v5.0试点扩展（M190三角色工作流）：今日手术安排 */}
            <Card
              size="small"
              title={<Badge count={TODAY_SURGERY.length} size="small" offset={[8, 0]}><Title level={5} style={{ margin: 0 }}>今日手术安排</Title></Badge>}
            >
              <Table
                rowKey="time"
                size="small"
                loading={loading}
                columns={surgeryColumns}
                dataSource={TODAY_SURGERY}
                pagination={false}
              />
            </Card>
          </Col>
          <Col xs={24} lg={12}>
            {/* v5.0试点扩展（M190三角色工作流）：待审医嘱汇总 */}
            <Card
              size="small"
              title={<Badge count={PENDING_ORDERS.length} size="small" offset={[8, 0]}><Title level={5} style={{ margin: 0 }}>待审医嘱汇总</Title></Badge>}
            >
              <Table
                rowKey="orderNo"
                size="small"
                loading={loading}
                columns={pendingOrderColumns}
                dataSource={PENDING_ORDERS}
                pagination={false}
              />
            </Card>
          </Col>
        </Row>

        <Card title="科室 KPI（红黄标红）" className="jl-table-cards">
          <Table rowKey="department" loading={loading} columns={kpiColumns} dataSource={data?.departmentKpis ?? []} pagination={false} size="small" />
        </Card>

        {/* v5.0试点扩展（M190三角色工作流）：开医嘱 → 过敏史提醒弹窗 */}
        <Modal
          open={!!orderPatient}
          onCancel={() => setOrderPatient(null)}
          onOk={() => setOrderPatient(null)}
          okText="已知悉过敏史，继续开医嘱"
          cancelText="取消"
          title={`开医嘱 · ${orderPatient?.name ?? ''}`}
          width={680}
          destroyOnClose
        >
          {orderPatient && (
            <>
              <Descriptions size="small" column={2} bordered style={{ marginBottom: 16 }}>
                <Descriptions.Item label="患者">{orderPatient.name}</Descriptions.Item>
                <Descriptions.Item label="性别/年龄">{orderPatient.gender} / {orderPatient.age}岁</Descriptions.Item>
                <Descriptions.Item label="科室">{orderPatient.dept}</Descriptions.Item>
                <Descriptions.Item label="门诊号">{orderPatient.id}</Descriptions.Item>
              </Descriptions>
              <Alert
                type="warning"
                showIcon
                style={{ marginBottom: 12 }}
                message="过敏史提醒（开医嘱前强制核对）"
                description={`该患者存在 ${MOCK_ALLERGIES.length} 条过敏记录，禁忌药品不得开立；开具青霉素类 / 磺胺类前须再次核对并留痕。`}
              />
              <Table
                rowKey="allergen"
                size="small"
                pagination={false}
                dataSource={MOCK_ALLERGIES}
                columns={[
                  { title: '过敏原', dataIndex: 'allergen', key: 'allergen' },
                  { title: '不良反应', dataIndex: 'reaction', key: 'reaction' },
                  {
                    title: '严重度', dataIndex: 'severity', key: 'severity',
                    render: (v: string) => <Tag color={v === '高' ? 'red' : v === '中' ? 'orange' : 'default'}>{v}</Tag>,
                  },
                ]}
              />
            </>
          )}
        </Modal>
      </Content>
    </Layout>
  );
}
