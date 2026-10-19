/*
 * 健澜科技 jlmedaios - 备份管理 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.backup_management;

import com.jlmedaios.monolith.backup_management.entity.BackupTask;
import com.jlmedaios.monolith.backup_management.service.BackupManagementService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 备份管理 Service 测试。
 */
@SpringBootTest
public class BackupManagementServiceTest {

    @Autowired
    private BackupManagementService backupManagementService;

    @Test
    void testTaskList() {
        List<BackupTask> tasks = backupManagementService.taskList();
        assertNotNull(tasks);
    }

    @Test
    void testRunBackup() {
        BackupTask task = backupManagementService.runBackup("daily-full-backup");
        assertNotNull(task.getId());
        assertEquals("RUNNING", task.getStatus());
        assertNotNull(task.getLastBackupTime());
    }

    @Test
    void testBackupHistory() {
        List<BackupTask> history = backupManagementService.backupHistory();
        assertNotNull(history);
    }
}
