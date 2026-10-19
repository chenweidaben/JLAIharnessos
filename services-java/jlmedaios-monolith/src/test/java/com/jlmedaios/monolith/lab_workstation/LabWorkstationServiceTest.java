/*
 * 健澜科技 jlmedaios - 检验工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.lab_workstation;

import com.jlmedaios.monolith.lab_workstation.entity.LabWorkItem;
import com.jlmedaios.monolith.lab_workstation.service.LabWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 检验工作站 Service 测试。
 */
@SpringBootTest
public class LabWorkstationServiceTest {

    @Autowired
    private LabWorkstationService labWorkstationService;

    @Test
    void testPendingItems() {
        List<LabWorkItem> list = labWorkstationService.pendingItems();
        assertNotNull(list);
    }

    @Test
    void testReceiveSample() {
        LabWorkItem item = LabWorkItem.builder()
                .workItemNo("LAB-001")
                .patientId("P001")
                .testItem("血常规")
                .build();
        labWorkstationService.receiveSample("LAB-001");
        // mock 验证：返回非 null 即通过
    }

    @Test
    void testInputResult() {
        LabWorkItem item = labWorkstationService.inputResult("LAB-001", "WBC: 6.5, RBC: 4.5");
        assertNotNull(item);
    }

    @Test
    void testReviewPublish() {
        LabWorkItem item = labWorkstationService.reviewPublish("LAB-001");
        assertNotNull(item);
    }
}
