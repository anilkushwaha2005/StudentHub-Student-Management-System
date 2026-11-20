package com.college.studentmanagement.forms;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface FormSubmissionRepository extends JpaRepository<FormSubmission,Long> {
    List<FormSubmission> findByStudentEmailIgnoreCaseOrderBySubmittedAtDesc(String email);
    List<FormSubmission> findByFormIdOrderBySubmittedAtDesc(Long formId);
    boolean existsByFormIdAndStudentEmailIgnoreCase(Long formId, String studentEmail);
    long deleteByFormId(Long formId);
    long deleteByStudentEmailIgnoreCase(String studentEmail);
}
