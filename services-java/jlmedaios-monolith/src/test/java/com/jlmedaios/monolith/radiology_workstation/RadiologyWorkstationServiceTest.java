/*
 * 健澜科技 jlmedaios - 影像工作站 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.radiology_workstation;

import com.jlmedaios.monolith.radiology_workstation.entity.RadiologyWorkItem;
import com.jlmedaios.monolith.radiology_workstation.service.RadiologyWorkstationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 影像工作站 Service 测试。
 */
@SpringBootTest
public class RadiologyWorkstationServiceTest {

    @Autowired
    private RadiologyWorkstationService radiologyWorkstationService;

    @Test
    void testPendingStudies() {
        List<RadiologyWorkItem> list = radiologyWorkstationService.pendingStudies();
        assertNotNull(list);
    }

    @Test
    void testStartStudy() {
        RadiologyWorkItem item = radiologyWorkstationService.startStudy("RAD-001");
        assertNotNull(item);
    }

    @Test
    void testWriteReport() {
        RadiologyWorkItem item = radiologyWorkstationService.writeReport("RAD-001", "双肺纹理清晰...");
        assertNotNull(item);
    }

    @Test
    void testReviewPublish() {
        RadiologyWorkItem item = radiologyWorkstationService.reviewPublish("RAD-001");
        assertNotNull(item);
    }
}
