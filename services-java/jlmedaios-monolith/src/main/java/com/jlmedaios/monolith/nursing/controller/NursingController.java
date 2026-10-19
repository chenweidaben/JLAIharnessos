/*
 * 健澜科技 jlmedaios - 护理执行 Controller
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.nursing.controller;

import com.jlmedaios.monolith.common.Result;
import com.jlmedaios.monolith.nursing.entity.NursingOrder;
import com.jlmedaios.monolith.nursing.service.NursingService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * 护理执行 Controller。
 */
@RestController
@RequiredArgsConstructor
@RequestMapping("/api/nursing")
public class NursingController {

    private final NursingService nursingService;

    /**
     * 创建护理医嘱。
     *
     * @param body {patientId, nursingType, content}
     * @return Result<NursingOrder>
     */
    @PostMapping("/order")
    public Result<NursingOrder> create(@RequestBody Map<String, Object> body) {
        Long patientId = Long.valueOf(String.valueOf(body.get("patientId")));
        String nursingType = String.valueOf(body.get("nursingType"));
        String content = String.valueOf(body.get("content"));
        NursingOrder order = NursingOrder.builder()
                .patientId(patientId)
                .nursingType(nursingType)
                .content(content)
                .build();
        return Result.ok(nursingService.create(order));
    }

    /**
     * 执行护理医嘱。
     *
     * @param id   护理医嘱 ID
     * @param body {nurseName}
     * @return Result<NursingOrder>
     */
    @PutMapping("/order/{id}/execute")
    public Result<NursingOrder> execute(@PathVariable Long id, @RequestBody Map<String, String> body) {
        String nurseName = body.get("nurseName");
        return nursingService.execute(id, nurseName)
                .map(Result::ok)
                .orElseGet(() -> Result.fail(404, "护理医嘱不存在"));
    }
}
