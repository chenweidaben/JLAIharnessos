/**
 * 健澜科技 jlmedaios - 质控移动端通知 V14 单测（M526-C）
 *
 * 测试 buildMobileNotify 构建通知、notifyOnMobile 移动端通知、buildMobileNotifyReport 构建报告、读路由 GET auth:true。
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
import { describe, expect, it } from "bun:test";
import {
  buildMobileNotify,
  buildMobileNotifyReport,
  notifyOnMobile,
  type MobileNotifyInputV14,
} from "../../src/bff/aggregators/emrQcMobileNotifyV14Aggregator";
import { emrQcMobileNotifyV14Routes } from "../../src/bff/routes/emrQcMobileNotifyV14";
import type { RouteDef } from "../../src/bff/types";

describe("buildMobileNotify 构建通知", () => {
  // 手算：notifier='质控科', notifyType='缺陷通知' → 正确构建
  it("notifier='质控科', notifyType='缺陷通知' → 正确构建", () => {
    const notify = buildMobileNotify("质控科", "缺陷通知");
    expect(notify.notifier).toBe("质控科");
    expect(notify.notifyType).toBe("缺陷通知");
  });
});

describe("notifyOnMobile 多接收人", () => {
  // 手算：{recipients=['张医生','李医生','王医生'], message='您有新的病历缺陷待处理'}
  // 手算：sentCount = recipients.length = 3
  // 手算：sentCount=3 > 0 → status='已发送'
  it("{recipients=['张医生','李医生','王医生'], message='您有新的病历缺陷待处理'} → sentCount=3, status='已发送'", () => {
    const input: MobileNotifyInputV14 = {
      recipients: ["张医生", "李医生", "王医生"],
      message: "您有新的病历缺陷待处理",
    };
    const result = notifyOnMobile(input);
    expect(result.sentCount).toBe(3);
    expect(result.status).toBe("已发送");
  });
});

describe("notifyOnMobile 空接收人", () => {
  // 手算：{recipients=[], message='测试消息'}
  // 手算：sentCount = 0
  // 手算：sentCount=0 → status='未发送'
  it("{recipients=[], message='测试消息'} → sentCount=0, status='未发送'", () => {
    const input: MobileNotifyInputV14 = { recipients: [], message: "测试消息" };
    const result = notifyOnMobile(input);
    expect(result.sentCount).toBe(0);
    expect(result.status).toBe("未发送");
  });
});

describe("buildMobileNotifyReport 构建报告", () => {
  // 手算：{sentCount:3, status:'已发送'}
  // 手算：透传 sentCount + status
  it("{sentCount:3, status:'已发送'} → 正确返回（透传）", () => {
    const report = buildMobileNotifyReport({ sentCount: 3, status: "已发送" });
    expect(report.sentCount).toBe(3);
    expect(report.status).toBe("已发送");
  });
});

describe("读路由", () => {
  it("GET /api/v1/emr-qc-mobile-notify auth:true", () => {
    const def = (emrQcMobileNotifyV14Routes as RouteDef[]).find((d: RouteDef) => d.method === "GET" && d.path === "/api/v1/emr-qc-mobile-notify");
    expect(def).toBeDefined();
    expect(def?.auth).toBe(true);
  });
});
