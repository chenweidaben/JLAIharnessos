/*
 * 健澜科技 jlmedaios - 住院工作流 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.inpatient_workflow.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.inpatient_workflow.entity.InpatientEpisode;
import com.jlmedaios.monolith.inpatient_workflow.service.InpatientWorkflowService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 住院工作流 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/inpatient")
public class InpatientWorkflowController {

    private final InpatientWorkflowService inpatientWorkflowService;

    /**
     * 办理入院。
     *
     * @param body {episodeNo, patientId, admitDepartment, bedNo}
     * @return Result<InpatientEpisode>
     */
    @PostMapping("/admit")
    public Result<InpatientEpisode> admit(@RequestBody Map<String, Object> body) {
        InpatientEpisode episode = inpatientWorkflowService.admit(
                String.valueOf(body.get("episodeNo")),
                String.valueOf(body.get("patientId")),
                String.valueOf(body.get("admitDepartment")),
                String.valueOf(body.get("bedNo"))
        );
        return Result.ok(episode);
    }

    /**
     * 办理出院。
     *
     * @param body {episodeId}
     * @return Result<InpatientEpisode>
     */
    @PutMapping("/discharge")
    public Result<InpatientEpisode> discharge(@RequestBody Map<String, Object> body) {
        return inpatientWorkflowService.discharge(
                Long.valueOf(String.valueOf(body.get("episodeId")))
        ).map(Result::ok).orElseGet(() -> Result.ok(null));
    }

    /**
     * 住院时间线。
     *
     * @param id episode ID
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/episode/{id}/timeline")
    public Result<Map<String, Object>> timeline(@PathVariable Long id) {
        return Result.ok(inpatientWorkflowService.timeline(id));
    }

    /**
     * 住院流程统计。
     *
     * @return Result<Map<String, Object>>
     */
    @GetMapping("/workflow/stats")
    public Result<Map<String, Object>> stats() {
        return Result.ok(inpatientWorkflowService.stats());
    }
}
