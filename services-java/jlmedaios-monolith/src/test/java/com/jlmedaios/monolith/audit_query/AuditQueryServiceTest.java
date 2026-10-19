/*
 * 健澜科技 jlmedaios - 审计日志查询 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.audit_query;

import com.jlmedaios.monolith.audit_query.entity.AuditLog;
import com.jlmedaios.monolith.audit_query.service.AuditQueryService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 审计日志查询 Service 测试。
 */
@SpringBootTest
public class AuditQueryServiceTest {

    @Autowired
    private AuditQueryService auditQueryService;

    @Test
    void testQueryLogs() {
        List<AuditLog> logs = auditQueryService.queryLogs(null, null, null);
        assertNotNull(logs);
    }

    @Test
    void testUserRecords() {
        List<AuditLog> records = auditQueryService.userRecords("U001");
        assertNotNull(records);
    }

    @Test
    void testStats() {
        Map<String, Object> stats = auditQueryService.stats();
        assertNotNull(stats);
        assertTrue(stats.containsKey("total_logs"));
        assertTrue(stats.containsKey("failure_rate"));
    }
}
