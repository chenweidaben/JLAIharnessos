/*
 * 健澜科技 jlmedaios - 手术排班 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.operation_schedule;

import com.jlmedaios.monolith.operation_schedule.entity.OperationSchedule;
import com.jlmedaios.monolith.operation_schedule.service.OperationScheduleService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 手术排班 Service 测试。
 */
@SpringBootTest
public class OperationScheduleServiceTest {

    @Autowired
    private OperationScheduleService operationScheduleService;

    @Test
    void testSchedule() {
        OperationSchedule schedule = operationScheduleService.schedule(
                "OR01", "DR001", "DR002", "ANA001",
                1L, "阑尾切除术",
                LocalDateTime.now().plusDays(1),
                LocalDateTime.now().plusDays(1).plusHours(2)
        );
        assertNotNull(schedule.getId());
        assertEquals("SCHEDULED", schedule.getStatus());
    }

    @Test
    void testStartAndFinish() {
        OperationSchedule schedule = operationScheduleService.schedule(
                "OR02", "DR003", "DR004", "ANA002",
                2L, "胆囊切除术",
                LocalDateTime.now(),
                LocalDateTime.now().plusHours(2)
        );
        Optional<OperationSchedule> started = operationScheduleService.start(schedule.getId());
        assertTrue(started.isPresent());
        assertEquals("IN_PROGRESS", started.get().getStatus());

        Optional<OperationSchedule> finished = operationScheduleService.finish(schedule.getId());
        assertTrue(finished.isPresent());
        assertEquals("COMPLETED", finished.get().getStatus());
    }

    @Test
    void testTodayList() {
        operationScheduleService.schedule(
                "OR03", "DR005", "DR006", "ANA003",
                3L, "疝气修补术",
                LocalDateTime.now(),
                LocalDateTime.now().plusHours(1)
        );
        assertNotNull(operationScheduleService.todayList());
    }
}
