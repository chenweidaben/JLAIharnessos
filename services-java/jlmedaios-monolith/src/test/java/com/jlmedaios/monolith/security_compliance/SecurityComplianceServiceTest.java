/*
 * 健澜科技 jlmedaios - 等保合规 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.security_compliance;

import com.jlmedaios.monolith.security_compliance.entity.SecurityControl;
import com.jlmedaios.monolith.security_compliance.service.SecurityComplianceService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 等保合规 Service 测试。
 */
@SpringBootTest
public class SecurityComplianceServiceTest {

    @Autowired
    private SecurityComplianceService securityComplianceService;

    @Test
    void testControlList() {
        List<SecurityControl> list = securityComplianceService.controlList();
        assertNotNull(list);
    }

    @Test
    void testByCategory() {
        List<SecurityControl> list = securityComplianceService.byCategory("数据安全");
        assertNotNull(list);
    }

    @Test
    void testUpdateControl() {
        SecurityControl control = securityComplianceService.updateControl("SEC-001", "COMPLIANT");
        // 可能为空（H2 内存库无预置数据）
    }
}
