/*
 * 健澜科技 jlmedaios - 随访 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.followup.entity.FollowupTask;
import com.jlmedaios.monolith.followup.service.FollowupService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * 随访 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/followup")
public class FollowupController {

    private final FollowupService followupService;

    /**
     * 自动生成随访计划。
     *
     * @param body {patientId, dischargeDate, planDate, questionnaireContent}
     * @return Result<FollowupTask>
     */
    @PostMapping("/plan")
    public Result<FollowupTask> plan(@RequestBody Map<String, Object> body) {
        FollowupTask task = followupService.plan(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                LocalDate.parse(String.valueOf(body.get("dischargeDate"))),
                LocalDate.parse(String.valueOf(body.get("planDate"))),
                String.valueOf(body.get("questionnaireContent"))
        );
        return Result.ok(task);
    }

    /**
     * 完成随访。
     *
     * @param id   随访任务 ID
     * @param body {feedbackText, satisfaction}
     * @return Result<FollowupTask>
     */
    @PutMapping("/{id}/complete")
    public Result<FollowupTask> complete(@PathVariable Long id,
                                         @RequestBody Map<String, Object> body) {
        String feedbackText = String.valueOf(body.get("feedbackText"));
        int satisfaction = Integer.parseInt(String.valueOf(body.get("satisfaction")));
        return followupService.complete(id, feedbackText, satisfaction)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "随访任务不存在"));
    }

    /**
     * 待随访列表。
     *
     * @return Result<List<FollowupTask>>
     */
    @GetMapping("/pending")
    public Result<List<FollowupTask>> pendingList() {
        return Result.ok(followupService.pendingList());
    }
}
