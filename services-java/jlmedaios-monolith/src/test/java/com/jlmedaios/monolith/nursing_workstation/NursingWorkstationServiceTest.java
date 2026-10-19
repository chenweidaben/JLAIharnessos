/*
 * 健澜科技 jlmedaios - 护理工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_workstation;

import com.jlmedaios.monolith.nursing_workstation.entity.NursingHandover;
import com.jlmedaios.monolith.nursing_workstation.service.NursingWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 护理工作站 Service 测试。
 */
@SpringBootTest
public class NursingWorkstationServiceTest {

    @Autowired
    private NursingWorkstationService nursingWorkstationService;

    @Test
    void testTodayTasks() {
        List<Map<String, Object>> tasks = nursingWorkstationService.todayTasks();
        assertNotNull(tasks);
    }

    @Test
    void testCreateHandover() {
        NursingHandover handover = nursingWorkstationService.createHandover(
                "HO-202610-001", "CARD-WARD-1", "白班", "N001", "N002", 42);
        assertNotNull(handover.getId());
        assertEquals("COMPLETED", handover.getStatus());
    }

    @Test
    void testHandoverHistory() {
        List<NursingHandover> history = nursingWorkstationService.handoverHistory("CARD-WARD-1");
        assertNotNull(history);
    }

    @Test
    void testExecuteOrder() {
        Map<String, Object> result = nursingWorkstationService.executeOrder(1L);
        assertNotNull(result);
        assertEquals("EXECUTED", result.get("status"));
    }
}
