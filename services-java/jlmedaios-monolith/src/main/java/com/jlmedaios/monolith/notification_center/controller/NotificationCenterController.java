/*
 * 健澜科技 jlmedaios - 消息通知中心 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.notification_center.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.notification_center.entity.NotificationMessage;
import com.jlmedaios.monolith.notification_center.service.NotificationCenterService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 消息通知中心 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/notification")
public class NotificationCenterController {

    private final NotificationCenterService notificationCenterService;

    /**
     * 发送通知。
     *
     * @param body {receiverId, channel, title, content}
     * @return Result<NotificationMessage>
     */
    @PostMapping("/send")
    public Result<NotificationMessage> sendNotification(@RequestBody Map<String, Object> body) {
        NotificationMessage message = notificationCenterService.sendNotification(
                String.valueOf(body.get("receiverId")),
                String.valueOf(body.get("channel")),
                String.valueOf(body.get("title")),
                String.valueOf(body.get("content"))
        );
        return Result.ok(message);
    }

    /**
     * 发送历史。
     *
     * @return Result<List<NotificationMessage>>
     */
    @GetMapping("/history")
    public Result<List<NotificationMessage>> history() {
        return Result.ok(notificationCenterService.history());
    }

    /**
     * 失败重发列表。
     *
     * @return Result<List<NotificationMessage>>
     */
    @GetMapping("/failed")
    public Result<List<NotificationMessage>> failedList() {
        return Result.ok(notificationCenterService.failedList());
    }
}
