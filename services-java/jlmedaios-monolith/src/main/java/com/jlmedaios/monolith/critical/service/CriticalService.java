/*
 * 健澜科技 jlmedaios - 危急值 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.critical.service;

import com.jlmedaios.monolith.critical.entity.CriticalValue;
import com.jlmedaios.monolith.critical.repository.CriticalValueRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

/**
 * 危急值 Service。
 */
@Service
@RequiredArgsConstructor
public class CriticalService {

    private final CriticalValueRepository criticalValueRepository;

    /**
     * 检验科报告危急值。
     *
     * @param patientId      患者 ID
     * @param testItem       检验项目
     * @param resultValue    结果值
     * @param referenceRange 参考范围
     * @param level          级别（CRITICAL/WARNING）
     * @return 已持久化的危急值
     */
    public CriticalValue report(Long patientId, String testItem, String resultValue,
                                 String referenceRange, String level) {
        CriticalValue cv = CriticalValue.builder()
                .patientId(patientId)
                .testItem(testItem)
                .resultValue(resultValue)
                .referenceRange(referenceRange)
                .level(level)
                .build();
        return criticalValueRepository.save(cv);
    }

    /**
     * 医生接收（status → ACKED + receiverAckTime=now）。
     *
     * @param id    危急值 ID
     * @param ackBy 接收人
     * @return 更新后的危急值
     */
    public Optional<CriticalValue> ack(Long id, String ackBy) {
        Optional<CriticalValue> opt = criticalValueRepository.findById(id);
        opt.ifPresent(cv -> {
            cv.setStatus("ACKED");
            cv.setReceiverAckTime(LocalDateTime.now());
            cv.setAckBy(ackBy);
            criticalValueRepository.save(cv);
        });
        return opt;
    }

    /**
     * 临床处置（status → CLOSED）。
     *
     * @param id              危急值 ID
     * @param clinicalAction  临床处置
     * @return 更新后的危急值
     */
    public Optional<CriticalValue> action(Long id, String clinicalAction) {
        Optional<CriticalValue> opt = criticalValueRepository.findById(id);
        opt.ifPresent(cv -> {
            cv.setStatus("CLOSED");
            cv.setClinicalAction(clinicalAction);
            criticalValueRepository.save(cv);
        });
        return opt;
    }

    /**
     * 未闭环列表（status != CLOSED）。
     *
     * @return 未闭环危急值列表
     */
    public List<CriticalValue> openList() {
        return criticalValueRepository.findAll().stream()
                .filter(cv -> !"CLOSED".equals(cv.getStatus()))
                .collect(Collectors.toList());
    }
}
