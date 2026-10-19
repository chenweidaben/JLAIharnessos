/*
 * 健澜科技 jlmedaios - 审计 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit;

import com.jlmedaios.monolith.audit.entity.AuditLog;
import com.jlmedaios.monolith.audit.service.AuditService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 审计 Service 测试。
 */
@SpringBootTest
public class AuditServiceTest {

    @Autowired
    private AuditService auditService;

    @Test
    void testLog() {
        AuditLog log = auditService.log("U001", "张医生", "登录",
                "Patient", "P001", null, null, "127.0.0.1", "Mozilla/5.0");
        assertNotNull(log.getId());
        assertEquals("登录", log.getAction());
    }

    @Test
    void testQueryByAction() {
        auditService.log("U002", "李医生", "查询", "Order", "O001",
                null, null, "192.168.1.1", "Chrome");
        List<AuditLog> list = auditService.query(null, "查询", null, null);
        assertNotNull(list);
        assertTrue(list.size() >= 1);
    }

    @Test
    void testExportRisk() {
        auditService.log("U003", "王医生", "导出", "Patient", "P001",
                null, null, "10.0.0.1", "Firefox");
        List<AuditLog> risk = auditService.exportRisk();
        assertNotNull(risk);
        assertTrue(risk.size() >= 1);
    }
}
