/*
 * 健澜科技 jlmedaios - 数据迁移工具 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.data_migration_tool;

import com.jlmedaios.monolith.data_migration_tool.entity.MigrationTask;
import com.jlmedaios.monolith.data_migration_tool.service.DataMigrationToolService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;
import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 数据迁移工具 Service 测试。
 */
@SpringBootTest
public class DataMigrationToolServiceTest {

    @Autowired
    private DataMigrationToolService dataMigrationToolService;

    @Test
    void testCreateTask() {
        MigrationTask task = dataMigrationToolService.createTask(
                "患者数据迁移", "旧HIS", "patient", "full", 10000);
        assertNotNull(task.getId());
        assertEquals("PENDING", task.getStatus());
    }

    @Test
    void testStartTask() {
        dataMigrationToolService.createTask("医嘱数据迁移", "旧EMR", "orders", "incremental", 5000);
        MigrationTask started = dataMigrationToolService.startTask("医嘱数据迁移");
        assertNotNull(started);
        assertEquals("COMPLETED", started.getStatus());
    }

    @Test
    void testProgress() {
        dataMigrationToolService.createTask("检验数据迁移", "LIS", "lab_result", "full", 8000);
        Map<String, Object> progress = dataMigrationToolService.progress("检验数据迁移");
        assertNotNull(progress);
    }

    @Test
    void testTaskList() {
        List<MigrationTask> list = dataMigrationToolService.taskList();
        assertNotNull(list);
    }
}
