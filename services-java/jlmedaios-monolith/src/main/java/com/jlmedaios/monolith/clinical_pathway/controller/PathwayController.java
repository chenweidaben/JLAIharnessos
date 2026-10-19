/*
 * 健澜科技 jlmedaios - 临床路径 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_pathway.controller;

import com.jlmedaios.monolith.clinical_pathway.entity.PathwayRecord;
import com.jlmedaios.monolith.clinical_pathway.service.PathwayService;
import com.jlmedaios.monolith.common.Result;
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
 * 临床路径 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/pathway")
public class PathwayController {

    private final PathwayService pathwayService;

    /**
     * 入径。
     *
     * @param body {patientId, pathwayCode, expectedDays}
     * @return Result<PathwayRecord>
     */
    @PostMapping("/enroll")
    public Result<PathwayRecord> enroll(@RequestBody Map<String, Object> body) {
        PathwayRecord record = pathwayService.enroll(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("pathwayCode")),
                Integer.valueOf(String.valueOf(body.get("expectedDays")))
        );
        return Result.ok(record);
    }

    /**
     * 推进路径。
     *
     * @param id 路径记录 ID
     * @return Result<PathwayRecord>
     */
    @PutMapping("/{id}/advance")
    public Result<PathwayRecord> advance(@PathVariable Long id) {
        return pathwayService.advance(id)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "路径记录不存在"));
    }

    /**
     * 变异。
     *
     * @param id   路径记录 ID
     * @param body {deviationNote}
     * @return Result<PathwayRecord>
     */
    @PutMapping("/{id}/deviate")
    public Result<PathwayRecord> deviate(@PathVariable Long id,
                                         @RequestBody Map<String, String> body) {
        String deviationNote = body.get("deviationNote");
        return pathwayService.deviate(id, deviationNote)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "路径记录不存在"));
    }

    /**
     * 在径列表。
     *
     * @return Result<List<PathwayRecord>>
     */
    @GetMapping("/in-progress")
    public Result<List<PathwayRecord>> inProgress() {
        return Result.ok(pathwayService.inProgress());
    }
}
