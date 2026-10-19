/*
 * 健澜科技 jlmedaios - 眼科工作站 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.ophthalmology_workstation.service;

import com.jlmedaios.monolith.ophthalmology_workstation.entity.EyeExamRecord;
import com.jlmedaios.monolith.ophthalmology_workstation.repository.EyeExamRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.util.List;

/**
 * 眼科工作站 Service。
 *
 * <p>append-only: 眼科检查记录不可修改</p>
 */
@Service
@RequiredArgsConstructor
public class OphthalmologyWorkstationService {

    private final EyeExamRecordRepository eyeExamRecordRepository;

    /**
     * 今日眼科患者。
     *
     * @return 眼科检查记录列表
     */
    public List<EyeExamRecord> todayPatients() {
        return eyeExamRecordRepository.findAll();
    }

    /**
     * 创建检查记录。
     *
     * @param recordNo            记录编号
     * @param patientId           患者 ID
     * @param visitType          就诊类型
     * @param visualScOD          右眼裸眼视力
     * @param visualScOS          左眼裸眼视力
     * @param intraocularPressureOD 右眼眼压
     * @param intraocularPressureOS 左眼眼压
     * @param lensExam            晶状体检查
     * @param fundusExam          眼底检查
     * @return 已创建的眼科检查记录
     */
    public EyeExamRecord createExam(String recordNo, String patientId, String visitType,
                                     String visualScOD, String visualScOS,
                                     BigDecimal intraocularPressureOD, BigDecimal intraocularPressureOS,
                                     String lensExam, String fundusExam) {
        EyeExamRecord record = EyeExamRecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .visitType(visitType)
                .visualScOD(visualScOD)
                .visualScOS(visualScOS)
                .intraocularPressureOD(intraocularPressureOD)
                .intraocularPressureOS(intraocularPressureOS)
                .lensExam(lensExam)
                .fundusExam(fundusExam)
                .build();
        return eyeExamRecordRepository.save(record);
    }

    /**
     * 开具诊断。
     *
     * @param recordNo    记录编号
     * @param diagnosis   诊断
     * @param prescription 处方
     * @return 已开具诊断的眼科检查记录
     */
    public EyeExamRecord makeDiagnosis(String recordNo, String diagnosis, String prescription) {
        EyeExamRecord record = eyeExamRecordRepository.findByRecordNo(recordNo);
        if (record != null) {
            record.setDiagnosis(diagnosis);
            record.setPrescription(prescription);
            return eyeExamRecordRepository.save(record);
        }
        return null;
    }

    /**
     * 患者眼科史。
     *
     * @param patientId 患者 ID
     * @return 眼科检查记录列表
     */
    public List<EyeExamRecord> eyeHistory(Long patientId) {
        return eyeExamRecordRepository.findByPatientId(String.valueOf(patientId));
    }
}
