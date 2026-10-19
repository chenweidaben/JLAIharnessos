/*
 * 健澜科技 jlmedaios - 消息通知 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.his.message.controller;

import com.jlmedaios.his.message.common.Result;
import com.jlmedaios.his.message.entity.Message;
import com.jlmedaios.his.message.service.MessageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;
import java.util.Map;

/**
 * 消息通知 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/his/message")
public class MessageController {

    private final MessageService messageService;

    /**
     * 发送消息。
     *
     * @param body {receiverId, content, type}
     * @return Result<Message>
     */
    @PostMapping("/send")
    public Result<Message> send(@RequestBody Map<String, String> body) {
        Message msg = messageService.send(
                body.get("receiverId"),
                body.get("content"),
                body.get("type")
        );
        return Result.ok(msg);
    }

    /**
     * 收件箱。
     *
     * @param receiverId 接收人 ID
     * @return Result<List<Message>>
     */
    @GetMapping("/inbox/{receiverId}")
    public Result<List<Message>> inbox(@PathVariable String receiverId) {
        return Result.ok(messageService.inbox(receiverId));
    }

    /**
     * 标记已读。
     *
     * @param id 消息 ID
     * @return Result<Message>
     */
    @PutMapping("/{id}/read")
    public Result<Message> markRead(@PathVariable Long id) {
        return messageService.markRead(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "消息不存在"));
    }
}
