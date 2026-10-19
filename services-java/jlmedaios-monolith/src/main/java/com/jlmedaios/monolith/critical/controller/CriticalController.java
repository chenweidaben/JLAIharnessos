/*
 * 健澜科技 jlmedaios - 危急值 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.critical.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.critical.entity.CriticalValue;
import com.jlmedaios.monolith.critical.service.CriticalService;
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
 * 危急值 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/critical")
public class CriticalController {

    private final CriticalService criticalService;

    /**
     * 检验科报告危急值。
     *
     * @param body {patientId, testItem, resultValue, referenceRange, level}
     * @return Result<CriticalValue>
     */
    @PostMapping("/report")
    public Result<CriticalValue> report(@RequestBody Map<String, Object> body) {
        CriticalValue cv = criticalService.report(
                Long.valueOf(String.valueOf(body.get("patientId"))),
                String.valueOf(body.get("testItem")),
                String.valueOf(body.get("resultValue")),
                String.valueOf(body.get("referenceRange")),
                String.valueOf(body.get("level"))
        );
        return Result.ok(cv);
    }

    /**
     * 医生接收。
     *
     * @param id   危急值 ID
     * @param body {ackBy}
     * @return Result<CriticalValue>
     */
    @PutMapping("/{id}/ack")
    public Result<CriticalValue> ack(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String ackBy = body.get("ackBy");
        return criticalService.ack(id, ackBy)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "危急值不存在"));
    }

    /**
     * 临床处置。
     *
     * @param id   危急值 ID
     * @param body {clinicalAction}
     * @return Result<CriticalValue>
     */
    @PutMapping("/{id}/action")
    public Result<CriticalValue> action(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String clinicalAction = body.get("clinicalAction");
        return criticalService.action(id, clinicalAction)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "危急值不存在"));
    }

    /**
     * 未闭环列表。
     *
     * @return Result<List<CriticalValue>>
     */
    @GetMapping("/open")
    public Result<List<CriticalValue>> openList() {
        return Result.ok(criticalService.openList());
    }
}
