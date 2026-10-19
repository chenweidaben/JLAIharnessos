/*
 * 健澜科技 jlmedaios - 多租户管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.multi_tenant;

import com.jlmedaios.monolith.multi_tenant.entity.TenantInfo;
import com.jlmedaios.monolith.multi_tenant.service.MultiTenantService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 多租户管理 Service 测试。
 */
@SpringBootTest
public class MultiTenantServiceTest {

    @Autowired
    private MultiTenantService multiTenantService;

    @Test
    void testTenantList() {
        List<TenantInfo> list = multiTenantService.tenantList();
        assertNotNull(list);
    }

    @Test
    void testCreateTenant() {
        TenantInfo tenant = multiTenantService.createTenant(
                "T001", "杭州市第一人民医院", "三甲医院", "张主任", "13800138000",
                LocalDate.now().plusYears(5));
        assertNotNull(tenant.getId());
        assertEquals("ENABLED", tenant.getStatus());
    }

    @Test
    void testEnableTenant() {
        multiTenantService.createTenant(
                "T002", "社区卫生服务中心", "社区卫生中心", "李医生", "13900139000",
                LocalDate.now().plusYears(3));
        TenantInfo updated = multiTenantService.enableTenant("T002", false);
        assertNotNull(updated);
        assertEquals("DISABLED", updated.getStatus());
    }
}
