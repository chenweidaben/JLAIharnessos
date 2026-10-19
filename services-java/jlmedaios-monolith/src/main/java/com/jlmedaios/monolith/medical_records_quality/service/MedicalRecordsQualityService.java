/*
 * 健澜科技 jlmedaios - 病历质控 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_quality.service;

import com.jlmedaios.monolith.medical_records_quality.entity.MRQCRecord;
import com.jlmedaios.monolith.medical_records_quality.repository.MRQCRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Optional;

/**
 * 病历质控 Service。
 *
 * <p>append-only: 病历质控记录不可修改；对应电子病历五级评审，自动质控规则+人工抽检</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalRecordsQualityService {

    private final MRQCRecordRepository mrqcRecordRepository;

    /**
     * 病历质控（mock 计算 passedCount/failedCount）。
     *
     * @param recordNo        记录编号
     * @param medicalRecordNo  病历号
     * @param deptCode         科室编码
     * @param qcType           质控类型
     * @param qcItemsJSON      质控项 JSON
     * @return 已持久化的质控记录
     */
    public MRQCRecord checkRecord(String recordNo, String medicalRecordNo, String deptCode,
                                    String qcType, String qcItemsJSON) {
        MRQCRecord record = MRQCRecord.builder()
                .recordNo(recordNo)
                .medicalRecordNo(medicalRecordNo)
                .deptCode(deptCode)
                .qcType(qcType)
                .qcItemsJSON(qcItemsJSON)
                .passedCount(8)
                .failedCount(2)
                .status("QC_PASSED")
                .build();
        return mrqcRecordRepository.save(record);
    }

    /**
     * 整改（status=RECTIFY）。
     *
     * @param recordId 记录 ID
     * @return 已更新的质控记录
     */
    public Optional<MRQCRecord> rectify(Long recordId) {
        Optional<MRQCRecord> opt = mrqcRecordRepository.findById(recordId);
        if (opt.isPresent()) {
            MRQCRecord record = opt.get();
            record.setStatus("RECTIFY");
            mrqcRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 待质控列表。
     *
     * @return 质控记录列表
     */
    public List<MRQCRecord> pendingList() {
        return mrqcRecordRepository.findByStatus("PENDING");
    }

    /**
     * 质控统计。
     *
     * @return 统计结果
     */
    public Map<String, Object> stats() {
        List<MRQCRecord> all = mrqcRecordRepository.findAll();
        Map<String, Object> result = new HashMap<>();
        result.put("total", all.size());
        result.put("passed", mrqcRecordRepository.findByStatus("QC_PASSED").size());
        int rectify = mrqcRecordRepository.findByStatus("RECTIFY").size();
        result.put("rectify_rate", all.isEmpty() ? "0%" : String.format("%.1f%%", rectify * 100.0 / all.size()));
        return result;
    }
}
