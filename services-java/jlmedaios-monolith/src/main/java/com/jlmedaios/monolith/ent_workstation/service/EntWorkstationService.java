/*
 * 健澜科技 jlmedaios - 耳鼻喉工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ent_workstation.service;

import com.jlmedaios.monolith.ent_workstation.entity.ENTRecord;
import com.jlmedaios.monolith.ent_workstation.repository.ENTRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;

/**
 * 耳鼻喉工作站 Service。
 *
 * <p>append-only: 耳鼻喉检查记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class EntWorkstationService {

    private final ENTRecordRepository entRecordRepository;

    /**
     * 今日耳鼻喉患者。
     *
     * @return 耳鼻喉检查记录列表
     */
    public List<ENTRecord> todayPatients() {
        return entRecordRepository.findAll();
    }

    /**
     * 创建检查记录。
     *
     * @param recordNo  记录编号
     * @param patientId 患者 ID
     * @param department 科室
     * @param examType   检查类型
     * @param findings   检查所见
     * @return 已创建的耳鼻喉检查记录
     */
    public ENTRecord createExam(String recordNo, String patientId, String department,
                                 String examType, String findings) {
        ENTRecord record = ENTRecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .department(department)
                .examType(examType)
                .findings(findings)
                .build();
        return entRecordRepository.save(record);
    }

    /**
     * 开具诊断。
     *
     * @param recordNo    记录编号
     * @param diagnosis   诊断
     * @param prescription 处方
     * @return 已开具诊断的耳鼻喉检查记录
     */
    public ENTRecord makeDiagnosis(String recordNo, String diagnosis, String prescription) {
        ENTRecord record = entRecordRepository.findByRecordNo(recordNo);
        if (record != null) {
            record.setDiagnosis(diagnosis);
            record.setPrescription(prescription);
            return entRecordRepository.save(record);
        }
        return null;
    }

    /**
     * 患者耳鼻喉史。
     *
     * @param patientId 患者 ID
     * @return 耳鼻喉检查记录列表
     */
    public List<ENTRecord> entHistory(Long patientId) {
        return entRecordRepository.findByPatientId(String.valueOf(patientId));
    }
}
