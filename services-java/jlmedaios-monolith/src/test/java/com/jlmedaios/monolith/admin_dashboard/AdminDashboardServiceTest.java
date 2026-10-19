/*
 * 健澜科技 jlmedaios - 管理驾驶舱 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.admin_dashboard;

import com.jlmedaios.monolith.admin_dashboard.entity.ExecutiveKPI;
import com.jlmedaios.monolith.admin_dashboard.service.AdminDashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 管理驾驶舱 Service 测试。
 */
@SpringBootTest
public class AdminDashboardServiceTest {

    @Autowired
    private AdminDashboardService adminDashboardService;

    @Test
    void testExecutiveOverview() {
        List<ExecutiveKPI> list = adminDashboardService.executiveOverview();
        assertNotNull(list);
    }

    @Test
    void testDeptView() {
        List<ExecutiveKPI> list = adminDashboardService.deptView("CARD");
        assertNotNull(list);
    }

    @Test
    void testAlerts() {
        List<ExecutiveKPI> alerts = adminDashboardService.alerts();
        assertNotNull(alerts);
    }
}
