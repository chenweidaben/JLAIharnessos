/*
 * 健澜科技 jlmedaios - 随访 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup;

import com.jlmedaios.monolith.followup.entity.FollowupTask;
import com.jlmedaios.monolith.followup.service.FollowupService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 随访 Service 测试。
 */
@SpringBootTest
public class FollowupServiceTest {

    @Autowired
    private FollowupService followupService;

    @Test
    void testPlan() {
        FollowupTask task = followupService.plan(1L, LocalDate.now().minusDays(7),
                LocalDate.now().plusDays(7), "请评价术后恢复情况");
        assertNotNull(task.getId());
        assertEquals("PENDING", task.getStatus());
    }

    @Test
    void testComplete() {
        FollowupTask task = followupService.plan(2L, LocalDate.now().minusDays(3),
                LocalDate.now(), "请评价用药依从性");
        Optional<FollowupTask> completed = followupService.complete(task.getId(),
                "恢复良好", 5);
        assertTrue(completed.isPresent());
        assertEquals("COMPLETED", completed.get().getStatus());
        assertEquals(5, completed.get().getSatisfaction());
    }

    @Test
    void testPendingList() {
        FollowupTask task = followupService.plan(3L, LocalDate.now(),
                LocalDate.now().plusDays(14), "术后 2 周随访");
        List<FollowupTask> pending = followupService.pendingList();
        assertNotNull(pending);
        assertTrue(pending.size() >= 1);
    }
}
