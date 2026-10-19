/*
 * 健澜科技 jlmedaios - 消息通知中心 Service 测试
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.notification_center;

import com.jlmedaios.monolith.notification_center.entity.NotificationMessage;
import com.jlmedaios.monolith.notification_center.service.NotificationCenterService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;

import java.util.List;

import static org.junit.jupiter.api.Assertions.*;

/**
 * 消息通知中心 Service 测试。
 */
@SpringBootTest
public class NotificationCenterServiceTest {

    @Autowired
    private NotificationCenterService notificationCenterService;

    @Test
    void testSendNotification() {
        NotificationMessage message = notificationCenterService.sendNotification(
                "P001", "短信", "就诊提醒", "您的预约时间为明天上午10点");
        assertNotNull(message.getId());
        assertEquals("DELIVERED", message.getSendStatus());
    }

    @Test
    void testHistory() {
        List<NotificationMessage> history = notificationCenterService.history();
        assertNotNull(history);
    }

    @Test
    void testFailedList() {
        List<NotificationMessage> failed = notificationCenterService.failedList();
        assertNotNull(failed);
    }
}
