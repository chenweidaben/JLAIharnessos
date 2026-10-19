/*
 * 健澜科技 jlmedaios - 临床路径 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.clinical_pathway.service;

import com.jlmedaios.monolith.clinical_pathway.entity.PathwayRecord;
import com.jlmedaios.monolith.clinical_pathway.repository.PathwayRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Optional;

/**
 * 临床路径 Service。
 */
@Service
@RequiredArgsConstructor
public class PathwayService {

    private final PathwayRecordRepository pathwayRecordRepository;

    /**
     * 入径。
     *
     * @param patientId    患者 ID
     * @param pathwayCode  路径编码
     * @param expectedDays 预期天数
     * @return 已持久化的临床路径记录
     */
    public PathwayRecord enroll(Long patientId, String pathwayCode, Integer expectedDays) {
        PathwayRecord record = PathwayRecord.builder()
                .patientId(patientId)
                .pathwayCode(pathwayCode)
                .expectedDays(expectedDays)
                .build();
        return pathwayRecordRepository.save(record);
    }

    /**
     * 推进路径（currentStage + 1）。
     *
     * @param id 路径记录 ID
     * @return 更新后的路径记录
     */
    public Optional<PathwayRecord> advance(Long id) {
        Optional<PathwayRecord> opt = pathwayRecordRepository.findById(id);
        opt.ifPresent(record -> {
            record.setCurrentStage(record.getCurrentStage() + 1);
            pathwayRecordRepository.save(record);
        });
        return opt;
    }

    /**
     * 变异（status → DEVIATED + deviationNote）。
     *
     * @param id             路径记录 ID
     * @param deviationNote   变异说明
     * @return 更新后的路径记录
     */
    public Optional<PathwayRecord> deviate(Long id, String deviationNote) {
        Optional<PathwayRecord> opt = pathwayRecordRepository.findById(id);
        opt.ifPresent(record -> {
            record.setStatus("DEVIATED");
            record.setDeviationNote(deviationNote);
            pathwayRecordRepository.save(record);
        });
        return opt;
    }

    /**
     * 在径列表（status = ENROLLED）。
     *
     * @return 在径路径列表
     */
    public List<PathwayRecord> inProgress() {
        return pathwayRecordRepository.findByStatus("ENROLLED");
    }
}
