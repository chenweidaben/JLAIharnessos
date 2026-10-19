/*
 * 健澜科技 jlmedaios - 手术工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.or_workstation;

import com.jlmedaios.monolith.or_workstation.entity.ORWorkItem;
import com.jlmedaios.monolith.or_workstation.service.OrWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 手术工作站 Service 测试。
 */
@SpringBootTest
public class OrWorkstationServiceTest {

    @Autowired
    private OrWorkstationService orWorkstationService;

    @Test
    void testTodaySchedule() {
        List<ORWorkItem> list = orWorkstationService.todaySchedule();
        assertNotNull(list);
    }

    @Test
    void testStartSurgery() {
        ORWorkItem item = orWorkstationService.startSurgery("OR-001");
        assertNotNull(item);
    }

    @Test
    void testEndSurgery() {
        ORWorkItem item = orWorkstationService.endSurgery("OR-001");
        assertNotNull(item);
    }

    @Test
    void testSurgeryHistory() {
        List<ORWorkItem> history = orWorkstationService.surgeryHistory(1L);
        assertNotNull(history);
    }
}
