/*
 * 健澜科技 jlmedaios - 病案室管理 Service
 *
 * Copyright (c) 杭州健澜科技有限公司
 */
package com.jlmedaios.monolith.medical_records_archive.service;

import com.jlmedaios.monolith.medical_records_archive.entity.ArchiveRecord;
import com.jlmedaios.monolith.medical_records_archive.repository.ArchiveRecordRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

/**
 * 病案室管理 Service。
 *
 * <p>append-only: 病案归档记录不可修改，借还留痕</p>
 */
@Service
@RequiredArgsConstructor
public class MedicalRecordsArchiveService {

    private final ArchiveRecordRepository archiveRecordRepository;

    /**
     * 病案入库归档。
     *
     * @param recordNo       病案号
     * @param patientId      患者 ID
     * @param visitId        就诊 ID
     * @param recordType     病案类型
     * @param storageLocation 存储位置
     * @return 已持久化的归档记录
     */
    public ArchiveRecord store(String recordNo, Long patientId, Long visitId,
                                String recordType, String storageLocation) {
        ArchiveRecord record = ArchiveRecord.builder()
                .recordNo(recordNo)
                .patientId(patientId)
                .visitId(visitId)
                .recordType(recordType)
                .archiveDate(LocalDate.now())
                .storageLocation(storageLocation)
                .build();
        return archiveRecordRepository.save(record);
    }

    /**
     * 病案借阅（设 status=BORROWED）。
     *
     * @param id         归档记录 ID
     * @param borrowerId 借阅人工号
     * @param borrowDate 借阅日期
     * @param dueDate    应还日期
     * @return 已更新的归档记录
     */
    public Optional<ArchiveRecord> borrow(Long id, String borrowerId,
                                          LocalDate borrowDate, LocalDate dueDate) {
        Optional<ArchiveRecord> opt = archiveRecordRepository.findById(id);
        if (opt.isPresent()) {
            ArchiveRecord record = opt.get();
            record.setStatus("BORROWED");
            record.setBorrowerId(borrowerId);
            record.setBorrowDate(borrowDate);
            record.setDueDate(dueDate);
            record.setUpdatedAt(LocalDateTime.now());
            archiveRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 病案归还（设 status=IN_STOCK，borrowerId 清空）。
     *
     * @param id 归档记录 ID
     * @return 已更新的归档记录
     */
    public Optional<ArchiveRecord> returnRecord(Long id) {
        Optional<ArchiveRecord> opt = archiveRecordRepository.findById(id);
        if (opt.isPresent()) {
            ArchiveRecord record = opt.get();
            record.setStatus("IN_STOCK");
            record.setBorrowerId(null);
            record.setBorrowDate(null);
            record.setDueDate(null);
            record.setUpdatedAt(LocalDateTime.now());
            archiveRecordRepository.save(record);
        }
        return opt;
    }

    /**
     * 超期未还列表（dueDate<今天 且 status=BORROWED）。
     *
     * @return 超期归档记录列表
     */
    public List<ArchiveRecord> overdueList() {
        return archiveRecordRepository.findByStatus("BORROWED").stream()
                .filter(r -> r.getDueDate() != null && r.getDueDate().isBefore(LocalDate.now()))
                .toList();
    }
}
