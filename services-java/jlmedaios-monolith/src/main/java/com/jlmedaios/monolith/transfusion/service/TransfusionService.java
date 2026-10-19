/*
 * 健澜科技 jlmedaios - 输血 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.transfusion.service;

import com.jlmedaios.monolith.transfusion.entity.TransfusionRecord;
import com.jlmedaios.monolith.transfusion.repository.TransfusionRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * 输血 Service。
 */
@Service
@RequiredArgsConstructor
public class TransfusionService {

    private final TransfusionRecordRepository transfusionRecordRepository;

    /**
     * 申请输血。
     *
     * @param patientId     患者 ID
     * @param bloodType     血型（A/B/O/AB）
     * @param componentType 成分类型（红细胞/血浆/血小板）
     * @param volumeML      血量（ml）
     * @param donorNumber   献血号
     * @return 已持久化的输血记录
     */
    public TransfusionRecord request(Long patientId, String bloodType, String componentType,
                                      Integer volumeML, String donorNumber) {
        TransfusionRecord record = TransfusionRecord.builder()
                .patientId(patientId)
                .bloodType(bloodType)
                .componentType(componentType)
                .volumeML(volumeML)
                .donorNumber(donorNumber)
                .build();
        return transfusionRecordRepository.save(record);
    }

    /**
     * 核对发血（status → VERIFIED，preTest 全部设 true）。
     *
     * @param id 输血记录 ID
     * @return 更新后的输血记录
     */
    public Optional<TransfusionRecord> verify(Long id) {
        Optional<TransfusionRecord> opt = transfusionRecordRepository.findById(id);
        opt.ifPresent(r -> {
            r.setStatus("VERIFIED");
            r.setPreTestBloodType(true);
            r.setPreTestCrossmatch(true);
            r.setPreTestHbsAg(true);
            r.setPreTestAntiHcv(true);
            r.setPreTestAntiHiv(true);
            r.setPreTestAntiTp(true);
            transfusionRecordRepository.save(r);
        });
        return opt;
    }

    /**
     * 输血反应记录（status → REACTED）。
     *
     * @param id   输血记录 ID
     * @param note 反应备注
     * @return 更新后的输血记录
     */
    public Optional<TransfusionRecord> reaction(Long id, String note) {
        Optional<TransfusionRecord> opt = transfusionRecordRepository.findById(id);
        opt.ifPresent(r -> {
            r.setStatus("REACTED");
            transfusionRecordRepository.save(r);
        });
        return opt;
    }
}
