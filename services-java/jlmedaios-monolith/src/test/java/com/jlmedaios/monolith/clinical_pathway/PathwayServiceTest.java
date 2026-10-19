/*
 * 健澜科技 jlmedaios - 临床路径 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_pathway;

import com.jlmedaios.monolith.clinical_pathway.entity.PathwayRecord;
import com.jlmedaios.monolith.clinical_pathway.service.PathwayService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 临床路径 Service 测试。
 */
@SpringBootTest
public class PathwayServiceTest {

    @Autowired
    private PathwayService pathwayService;

    @Test
    void testEnroll() {
        PathwayRecord record = pathwayService.enroll(1L, "CP-肺炎-社区获得性", 7);
        assertNotNull(record.getId());
        assertEquals("ENROLLED", record.getStatus());
        assertEquals(1, record.getCurrentStage());
    }

    @Test
    void testAdvance() {
        PathwayRecord record = pathwayService.enroll(2L, "CP-阑尾炎", 5);
        Optional<PathwayRecord> advanced = pathwayService.advance(record.getId());
        assertTrue(advanced.isPresent());
        assertEquals(2, advanced.get().getCurrentStage());
    }

    @Test
    void testDeviate() {
        PathwayRecord record = pathwayService.enroll(3L, "CP-糖尿病", 10);
        Optional<PathwayRecord> deviated = pathwayService.deviate(record.getId(),
                "血糖控制不佳，调整方案");
        assertTrue(deviated.isPresent());
        assertEquals("DEVIATED", deviated.get().getStatus());
        assertEquals("血糖控制不佳，调整方案", deviated.get().getDeviationNote());
    }
}
