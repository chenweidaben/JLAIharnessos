/*
 * 健澜科技 jlmedaios - 随访计划 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.followup_plan.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.followup_plan.entity.FollowupPlan;
import com.jlmedaios.monolith.followup_plan.service.FollowupPlanService;
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
 * 随访计划 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/followup-plan")
public class FollowupPlanController {

    private final FollowupPlanService followupPlanService;

    /**
     * 创建随访计划。
     *
     * @param body {patientId, visitId, followupType, plannedDate, channel}
     * @return Result<FollowupPlan>
     */
    @PostMapping("/create")
    public Result<FollowupPlan> create(@RequestBody Map<String, Object> body) {
        FollowupPlan plan = followupPlanService.create(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                Long.valueOf(String.valueOf(body.get("visitId"))),
                String.valueOf(body.get("followupType")),
                LocalDate.parse(String.valueOf(body.get("plannedDate"))),
                String.valueOf(body.get("channel"))
        );
        return Result.ok(plan);
    }

    /**
     * 执行随访。
     *
     * @param id   计划 ID
     * @param body {executeNote}
     * @return Result<FollowupPlan>
     */
    @PutMapping("/{id}/execute")
    public Result<FollowupPlan> execute(@PathVariable Long id, @RequestBody Map<String, Object> body) {
        return followupPlanService.execute(id, String.valueOf(body.get("executeNote")))
                .map(Result::ok)
                .orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日待执行随访。
     *
     * @return Result<List<FollowupPlan>>
     */
    @GetMapping("/due")
    public Result<List<FollowupPlan>> dueToday() {
        return Result.ok(followupPlanService.dueToday());
    }

    /**
     * 创建随访计划（新路径）。
     *
     * @param body {planNo, patientId, diseaseCode, planType, followupDate, contactMethod}
     * @return Result<FollowupPlan>
     */
    @PostMapping("/plan")
    public Result<FollowupPlan> createPlan(@RequestBody Map<String, Object> body) {
        FollowupPlan plan = followupPlanService.createPlan(
                String.valueOf(body.get("planNo")),
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("diseaseCode")),
                String.valueOf(body.get("planType")),
                LocalDate.parse(String.valueOf(body.get("followupDate"))),
                String.valueOf(body.get("contactMethod"))
        );
        return Result.ok(plan);
    }

    /**
     * 完成随访。
     *
     * @param id 计划 ID
     * @return Result<FollowupPlan>
     */
    @PutMapping("/{id}/complete")
    public Result<FollowupPlan> complete(@PathVariable Long id) {
        return followupPlanService.complete(id)
                .map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 今日待随访列表。
     *
     * @return Result<List<FollowupPlan>>
     */
    @GetMapping("/today")
    public Result<List<FollowupPlan>> todayList() {
        return Result.ok(followupPlanService.todayList());
    }
}
