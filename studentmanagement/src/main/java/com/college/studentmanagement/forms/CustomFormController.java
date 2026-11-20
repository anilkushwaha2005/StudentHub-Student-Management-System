package com.college.studentmanagement.forms;

import com.college.studentmanagement.auth.User;
import com.college.studentmanagement.auth.UserRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.Resource;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.http.ContentDisposition;
import java.nio.file.*;
import java.io.IOException;
import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import java.util.*;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/forms")
public class CustomFormController {
    private final CustomFormRepository forms;
    private final FormSubmissionRepository submissions;
    private final UserRepository users;
    public CustomFormController(CustomFormRepository f, FormSubmissionRepository s, UserRepository u) {
        forms=f; submissions=s; users=u;
    }

    @GetMapping
    public List<CustomForm> list(Authentication auth) {
        if (isAdmin(auth)) return forms.findAll();
        User u=users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        return forms.findByActiveTrueOrderByIdDesc().stream().filter(f -> {
            if ("ALL".equalsIgnoreCase(f.getAccessMode())) return true;
            if ("COURSES".equalsIgnoreCase(f.getAccessMode())) {
                String c=u.getCourse();
                if(c==null || c.isBlank()) return false;
                return Arrays.stream(f.getAllowedCourses().split(","))
                    .map(String::trim).anyMatch(x -> x.equalsIgnoreCase(c));
            }
            if ("EMAILS".equalsIgnoreCase(f.getAccessMode()))
                return Arrays.stream(f.getAllowedCourses().split(","))
                    .map(String::trim).anyMatch(x -> x.equalsIgnoreCase(u.getEmail()));
            return false;
        }).collect(Collectors.toList());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PostMapping
    public ResponseEntity<?> create(@RequestBody FormRequest r) {
        if (r.title()==null || r.title().isBlank() || r.fieldsJson()==null)
            return ResponseEntity.badRequest().body(Map.of("error","Form title and fields are required"));
        CustomForm f=new CustomForm();
        f.setTitle(r.title().trim()); f.setDescription(r.description());
        f.setFieldsJson(r.fieldsJson()); f.setAccessMode(r.accessMode()==null?"ALL":r.accessMode().toUpperCase());
        f.setAllowedCourses(r.allowedCourses()==null?"":r.allowedCourses());
        f.setActive(r.active()==null || r.active());
        return ResponseEntity.ok(forms.save(f));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/{id}")
    public ResponseEntity<?> update(@PathVariable Long id,@RequestBody FormRequest r) {
        return forms.findById(id).map(f -> {
            f.setTitle(r.title()); f.setDescription(r.description()); f.setFieldsJson(r.fieldsJson());
            f.setAccessMode(r.accessMode()==null?"ALL":r.accessMode().toUpperCase());
            f.setAllowedCourses(r.allowedCourses()==null?"":r.allowedCourses());
            f.setActive(r.active()==null || r.active());
            return ResponseEntity.ok(forms.save(f));
        }).orElseGet(() -> ResponseEntity.notFound().build());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable Long id) {
        CustomForm form = forms.findById(id).orElse(null);
        if (form == null) return ResponseEntity.notFound().build();
        // Explicit Delete Form action permanently removes its submissions as well.
        submissions.deleteByFormId(id);
        forms.delete(form);
        return ResponseEntity.noContent().build();
    }

    @PreAuthorize("hasRole('ADMIN')")
    @Transactional
    @DeleteMapping("/submissions/{submissionId}")
    public ResponseEntity<?> deleteSubmission(@PathVariable Long submissionId) {
        if (!submissions.existsById(submissionId)) return ResponseEntity.notFound().build();
        submissions.deleteById(submissionId);
        return ResponseEntity.noContent().build();
    }

    private static final Path UPLOAD_DIR = Paths.get(System.getProperty("user.home"), ".studenthub-uploads").toAbsolutePath().normalize();
    private static final long MAX_FILE_SIZE = 10L * 1024 * 1024;
    private static final Set<String> ALLOWED_EXTENSIONS = Set.of(
        "pdf","doc","docx","ppt","pptx","xls","xlsx","jpg","jpeg","png","txt","zip"
    );

    @PostMapping(value="/uploads", consumes=MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> uploadFile(@RequestParam("file") MultipartFile file) {
        if (file == null || file.isEmpty())
            return ResponseEntity.badRequest().body(Map.of("error","Please choose a file to upload."));
        if (file.getSize() > MAX_FILE_SIZE)
            return ResponseEntity.badRequest().body(Map.of("error","Maximum file size is 10 MB."));
        String original = Paths.get(Objects.requireNonNullElse(file.getOriginalFilename(),"document")).getFileName().toString();
        String ext = "";
        int dot = original.lastIndexOf('.');
        if (dot >= 0 && dot < original.length()-1) ext = original.substring(dot+1).toLowerCase(Locale.ROOT);
        if (!ALLOWED_EXTENSIONS.contains(ext))
            return ResponseEntity.badRequest().body(Map.of("error","File type not allowed. Upload PDF, Office documents, images, TXT or ZIP."));
        String id = UUID.randomUUID().toString();
        try {
            Files.createDirectories(UPLOAD_DIR);
            Files.copy(file.getInputStream(), UPLOAD_DIR.resolve(id), StandardCopyOption.REPLACE_EXISTING);
            return ResponseEntity.ok(Map.of(
                "id", id, "name", original, "size", file.getSize(),
                "contentType", Objects.requireNonNullElse(file.getContentType(),"application/octet-stream"),
                "downloadUrl", "/api/forms/uploads/" + id + "?name=" + URLEncoder.encode(original, StandardCharsets.UTF_8)
            ));
        } catch (IOException ex) {
            return ResponseEntity.internalServerError().body(Map.of("error","Could not save uploaded file."));
        }
    }

    @GetMapping("/uploads/{id}")
    public ResponseEntity<Resource> downloadFile(@PathVariable String id, @RequestParam(defaultValue="document") String name) {
        if (!id.matches("[0-9a-fA-F-]{36}")) return ResponseEntity.badRequest().build();
        Path path = UPLOAD_DIR.resolve(id).normalize();
        if (!path.startsWith(UPLOAD_DIR) || !Files.isRegularFile(path)) return ResponseEntity.notFound().build();
        String safeName = Paths.get(name).getFileName().toString().replace("\\r","").replace("\\n","");
        Resource resource = new FileSystemResource(path);
        return ResponseEntity.ok()
            .contentType(MediaType.APPLICATION_OCTET_STREAM)
            .header(HttpHeaders.CONTENT_DISPOSITION, ContentDisposition.attachment().filename(safeName, StandardCharsets.UTF_8).build().toString())
            .body(resource);
    }

    @PostMapping("/{id}/submissions")
    public ResponseEntity<?> submit(@PathVariable Long id,@RequestBody SubmitRequest r,Authentication auth) {
        User u=users.findByEmailIgnoreCase(auth.getName()).orElseThrow();
        CustomForm f=forms.findById(id).orElse(null);
        if(f==null || !f.isActive()) return ResponseEntity.notFound().build();
        if(!isAllowed(f,u)) return ResponseEntity.status(403).body(Map.of("error","This form is not assigned to your account/course"));
        if(submissions.existsByFormIdAndStudentEmailIgnoreCase(id, u.getEmail()))
            return ResponseEntity.status(409).body(Map.of("error","You have already submitted this form."));
        FormSubmission s=new FormSubmission(); s.setFormId(id); s.setFormTitle(f.getTitle()); s.setStudentEmail(u.getEmail()); s.setAnswersJson(r.answersJson()==null?"{}":r.answersJson());
        return ResponseEntity.ok(submissions.save(s));
    }

    @GetMapping("/my-submissions")
    public List<FormSubmission> mySubmissions(Authentication auth) {
        if(isAdmin(auth)) return submissions.findAll();
        return submissions.findByStudentEmailIgnoreCaseOrderBySubmittedAtDesc(auth.getName());
    }

    @PreAuthorize("hasRole('ADMIN')")
    @PutMapping("/submissions/{submissionId}/status")
    public ResponseEntity<?> updateSubmissionStatus(@PathVariable Long submissionId, @RequestBody StatusRequest request) {
        FormSubmission submission = submissions.findById(submissionId).orElse(null);
        if (submission == null) return ResponseEntity.notFound().build();
        String status = request.status() == null ? "" : request.status().trim().toUpperCase(Locale.ROOT);
        if (!Set.of("SUBMITTED", "PENDING", "REVIEWED", "APPROVED", "REJECTED").contains(status))
            return ResponseEntity.badRequest().body(Map.of("error", "Unsupported submission status"));
        submission.setStatus(status);
        return ResponseEntity.ok(submissions.save(submission));
    }

    @PreAuthorize("hasRole('ADMIN')")
    @GetMapping("/{id}/submissions")
    public List<FormSubmission> byForm(@PathVariable Long id) { return submissions.findByFormIdOrderBySubmittedAtDesc(id); }

    private boolean isAdmin(Authentication a) {
        return a!=null && a.getAuthorities().stream().anyMatch(x -> x.getAuthority().equals("ROLE_ADMIN"));
    }
    private boolean isAllowed(CustomForm f,User u) {
        if("ALL".equalsIgnoreCase(f.getAccessMode())) return true;
        if("COURSES".equalsIgnoreCase(f.getAccessMode())) return u.getCourse()!=null && Arrays.stream(f.getAllowedCourses().split(",")).map(String::trim).anyMatch(x->x.equalsIgnoreCase(u.getCourse()));
        if("EMAILS".equalsIgnoreCase(f.getAccessMode())) return Arrays.stream(f.getAllowedCourses().split(",")).map(String::trim).anyMatch(x->x.equalsIgnoreCase(u.getEmail()));
        return false;
    }
    public record FormRequest(String title,String description,String fieldsJson,String accessMode,String allowedCourses,Boolean active) {}
    public record SubmitRequest(String answersJson) {}
    public record StatusRequest(String status) {}
}
