STUDENT MANAGEMENT SYSTEM — LOCAL SETUP

1) Backend
- Open the studentmanagement folder in VS Code.
- Open src/main/resources/application.properties.
- Replace CHANGE_ME with your local MySQL root password (do not include quotes).
- Confirm MySQL is running and the database student_db exists. If needed, run:
  CREATE DATABASE student_db;
- Open terminal in the folder containing pom.xml and run:
  .\mvnw.cmd spring-boot:run
- Wait for "Started StudentmanagementApplication" and "Tomcat started on port 8080".
- Test: http://localhost:8080/students

2) Frontend
- Open a second terminal in studentmanagement-react-frontend.
- Run:
  npm.cmd install
  npm.cmd run dev
- Open: http://localhost:5173

IMPORTANT
- Keep both terminals open.
- Frontend now requests /api/students and Vite proxies /api/* to the backend at port 8080.
  This avoids the usual localhost:5173 vs localhost:8080 browser CORS problem in local development.
- If port 8080 is already in use, do not start another backend instance. Test the existing one first.
- The backend uses Spring Data REST, so the API collection is /students.
- Student roll number and email are configured as unique values.
