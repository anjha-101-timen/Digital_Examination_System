// ✅ FIXED: No extra spaces in URLs
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
import { getFirestore, collection, getDocs, doc, deleteDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// 🔥 Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBTheLUNQAC_9ic4HflIAlXFIvawybkjpo",
  authDomain: "ofdigitalexamin.firebaseapp.com",
  projectId: "ofdigitalexamin",
  storageBucket: "ofdigitalexamin.firebasestorage.app",
  messagingSenderId: "1010482896632",
  appId: "1:1010482896632:web:ca8831b88e73749a84250d",
  measurementId: "G-8NLHDLEFE3"
};

// ✅ Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ✅ Wait for DOM to load
document.addEventListener("DOMContentLoaded", () => {
  // ✅ DOM Elements
  const examSelect = document.getElementById("examSelect");
  const examDetails = document.getElementById("examDetails");
  const confirmDelete = document.getElementById("confirmDelete");

  // Detail fields
  const examName = document.getElementById("examName");
  const examLevel = document.getElementById("examLevel");
  const examBranch = document.getElementById("examBranch");
  const examSubject = document.getElementById("examSubject");
  const examTopic = document.getElementById("examTopic");
  const examDuration = document.getElementById("examDuration");
  const examTotalQuestions = document.getElementById("examTotalQuestions");
  const examPositiveMarks = document.getElementById("examPositiveMarks");
  const examNegativeMarks = document.getElementById("examNegativeMarks");
  const examDate = document.getElementById("examDate");
  const examTime = document.getElementById("examTime");
  const examClasses = document.getElementById("examClasses");
  const examMcqOptions = document.getElementById("examMcqOptions");
  const examTimePerQuestion = document.getElementById("examTimePerQuestion");

  // Modal Elements
  const confirmModal = document.getElementById("confirmModal");
  const modalExamDetails = document.getElementById("modalExamDetails");
  const modalCancel = document.getElementById("modalCancel");
  const modalConfirm = document.getElementById("modalConfirm");

  let exams = [];
  let selectedExamId = null;

  // === Load Exams from Firestore ===
  async function loadExams() {
    if (!examSelect) {
      console.error("❌ examSelect not found");
      return;
    }

    examSelect.innerHTML = '<option value="">Loading exams...</option>';

    try {
      const querySnapshot = await getDocs(collection(db, "exams"));
      exams = [];
      examSelect.innerHTML = '<option value="">Select an exam to delete</option>';

      if (querySnapshot.size === 0) {
        examSelect.innerHTML = '<option value="">No exams found</option>';
        if (confirmDelete) confirmDelete.disabled = true;
        return;
      }

      querySnapshot.forEach((doc) => {
        const data = doc.data();
        exams.push({ id: doc.id, ...data });

        // ✅ Enhanced display in dropdown
        const option = document.createElement("option");
        option.value = doc.id;
        option.textContent = `${data.name} | ${data.branch} | ${data.subject} | ${data.topic}`;
        examSelect.appendChild(option);
      });

      if (confirmDelete) confirmDelete.disabled = true;
    } catch (error) {
      console.error("❌ Failed to load exams:", error);
      examSelect.innerHTML = '<option value="">Failed to load exams</option>';
    }
  }

  // === Show Exam Details ===
  examSelect?.addEventListener("change", () => {
    const id = examSelect.value;
    if (!id) {
      if (examDetails) examDetails.style.display = "none";
      if (confirmDelete) confirmDelete.disabled = true;
      return;
    }

    const exam = exams.find(e => e.id === id);
    if (!exam) return;

    // Populate details
    if (examName) examName.textContent = exam.name;
    if (examLevel) examLevel.textContent = exam.level;
    if (examBranch) examBranch.textContent = exam.branch;
    if (examSubject) examSubject.textContent = exam.subject || "Not specified";
    if (examTopic) examTopic.textContent = exam.topic || "Not specified";
    if (examDuration) examDuration.textContent = exam.duration || "Not specified";
    if (examTotalQuestions) examTotalQuestions.textContent = exam.totalQuestions || "Not specified";
    if (examPositiveMarks) examPositiveMarks.textContent = exam.positiveMarks || "Not specified";
    if (examNegativeMarks) examNegativeMarks.textContent = exam.negativeMarks || "Not specified";
    if (examDate) examDate.textContent = exam.examDate || "Not specified";
    if (examTime) examTime.textContent = exam.examTime || "Not specified";
    if (examClasses) examClasses.textContent = Array.isArray(exam.classes) ? exam.classes.join(", ") : "All";
    if (examMcqOptions) examMcqOptions.textContent = exam.mcqOptions || "4";
    if (examTimePerQuestion) examTimePerQuestion.textContent = exam.timePerQuestion || "60";

    if (examDetails) examDetails.style.display = "block";
    if (confirmDelete) confirmDelete.disabled = false;
    selectedExamId = id;
  });

  // === Open Confirmation Modal ===
  confirmDelete?.addEventListener("click", () => {
    if (!selectedExamId) return;
    const exam = exams.find(e => e.id === selectedExamId);

    // ✅ Populate modal with key details
    modalExamDetails.innerHTML = `
      <h4>${exam.name}</h4>
      <p><strong>Branch:</strong> ${exam.branch}</p>
      <p><strong>Subject:</strong> ${exam.subject || "Not specified"}</p>
      <p><strong>Topic:</strong> ${exam.topic || "Not specified"}</p>
    `;

    // ✅ Show modal
    confirmModal.classList.add("show");
  });

  // === Close Modal ===
  modalCancel?.addEventListener("click", () => {
    confirmModal.classList.remove("show");
  });

  // === Close modal on click outside ===
  confirmModal?.addEventListener('click', (e) => {
    if (e.target === confirmModal) {
      confirmModal.classList.remove("show");
    }
  });

  // === Confirm Deletion ===
  modalConfirm?.addEventListener("click", async () => {
    if (!selectedExamId) return;

    try {
      await deleteDoc(doc(db, "exams", selectedExamId));
      // ✅ NO ALERT — Just reload to reflect changes
      location.reload();
    } catch (error) {
      console.error("❌ Delete failed:", error);
      alert("Delete failed: " + error.message); // Only show alert on error
    } finally {
      confirmModal.classList.remove("show");
    }
  });

  // ✅ Final Check
  console.log("✅ Delete page loaded. Elements ready.");
  console.log("confirmDelete:", confirmDelete);
  console.log("confirmModal:", confirmModal);

  // === Load on Page Load ===
  loadExams();
});