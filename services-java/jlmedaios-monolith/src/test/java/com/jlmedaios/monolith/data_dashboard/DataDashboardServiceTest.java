/*
 * 健澜科技 jlmedaios - 数据看板 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_dashboard;

import com.jlmedaios.monolith.data_dashboard.service.DataDashboardService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 数据看板 Service 测试。
 */
@SpringBootTest
public class DataDashboardServiceTest {

    @Autowired
    private DataDashboardService dataDashboardService;

    @Test
    void testHospitalOverview() {
        Map<String, Object> overview = dataDashboardService.hospitalOverview();
        assertNotNull(overview);
        assertTrue(overview.containsKey("today_outpatient"));
        assertTrue(overview.containsKey("in_patient_count"));
    }

    @Test
    void testDepartmentBoard() {
        Map<String, Object> board = dataDashboardService.departmentBoard("CARD");
        assertNotNull(board);
        assertEquals("CARD", board.get("dept_code"));
    }

    @Test
    void testRealTimeData() {
        Map<String, Object> realTime = dataDashboardService.realTimeData();
        assertNotNull(realTime);
        assertTrue(realTime.containsKey("timestamp"));
        assertTrue(realTime.containsKey("metrics"));
    }
}
