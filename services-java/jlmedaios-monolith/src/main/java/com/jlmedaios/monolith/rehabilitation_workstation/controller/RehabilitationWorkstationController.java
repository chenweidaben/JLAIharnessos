/*
 * 健澜科技 jlmedaios - 康复工作站 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.rehabilitation_workstation.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.rehabilitation_workstation.entity.RehabSession;
import com.jlmedaios.monolith.rehabilitation_workstation.service.RehabilitationWorkstationService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 康复工作站 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/rehab")
public class RehabilitationWorkstationController {

    private final RehabilitationWorkstationService rehabilitationWorkstationService;

    /**
     * 今日康复安排。
     *
     * @return Result<List<RehabSession>>
     */
    @GetMapping("/today")
    public Result<List<RehabSession>> todaySessions() {
        return Result.ok(rehabilitationWorkstationService.todaySessions());
    }

    /**
     * 创建治疗安排。
     *
     * @param body {sessionNo, patientId, therapyType, therapist, durationMinutes}
     * @return Result<RehabSession>
     */
    @PostMapping("/session")
    public Result<RehabSession> createSession(@RequestBody Map<String, Object> body) {
        RehabSession session = rehabilitationWorkstationService.createSession(
                String.valueOf(body.get("sessionNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("therapyType")),
                String.valueOf(body.get("therapist")),
                Integer.valueOf(String.valueOf(body.get("durationMinutes")))
        );
        return Result.ok(session);
    }

    /**
     * 完成治疗。
     *
     * @param sessionNo 治疗场次编号
     * @param body      {notes}
     * @return Result<RehabSession>
     */
    @PutMapping("/{sessionNo}/complete")
    public Result<RehabSession> completeSession(@PathVariable String sessionNo,
                                                 @RequestBody Map<String, Object> body) {
        return Result.ok(rehabilitationWorkstationService.completeSession(sessionNo,
                String.valueOf(body.get("notes"))));
    }

    /**
     * 患者康复计划。
     *
     * @param patientId 患者 ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/{patientId}/plan")
    public Result<Map<String, Object>> rehabPlan(@PathVariable Long patientId) {
        return Result.ok(rehabilitationWorkstationService.rehabPlan(patientId));
    }
}
