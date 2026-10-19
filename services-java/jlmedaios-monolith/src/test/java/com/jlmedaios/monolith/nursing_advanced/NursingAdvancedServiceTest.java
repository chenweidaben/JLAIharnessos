/*
 * 健澜科技 jlmedaios - 护理高级 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing_advanced;

import com.jlmedaios.monolith.nursing_advanced.entity.NursingTask;
import com.jlmedaios.monolith.nursing_advanced.service.NursingAdvancedService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 护理高级 Service 测试。
 */
@SpringBootTest
public class NursingAdvancedServiceTest {

    @Autowired
    private NursingAdvancedService nursingAdvancedService;

    @Test
    void testTodayTasksEmpty() {
        List<NursingTask> tasks = nursingAdvancedService.todayTasks();
        assertNotNull(tasks);
    }

    @Test
    void testCompleteTaskNotFound() {
        Optional<NursingTask> result = nursingAdvancedService.completeTask(999L);
        assertTrue(result.isEmpty());
    }

    @Test
    void testPatientTasks() {
        List<NursingTask> tasks = nursingAdvancedService.patientTasks(1L);
        assertNotNull(tasks);
    }
}
