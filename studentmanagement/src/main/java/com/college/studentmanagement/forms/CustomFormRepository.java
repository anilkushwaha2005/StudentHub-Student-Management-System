package com.college.studentmanagement.forms;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
public interface CustomFormRepository extends JpaRepository<CustomForm,Long> {
    List<CustomForm> findByActiveTrueOrderByIdDesc();
}
