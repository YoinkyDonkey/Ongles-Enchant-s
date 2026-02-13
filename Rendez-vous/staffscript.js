import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  query,
  orderBy,
  onSnapshot,
  doc,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

/* ---------- FIREBASE ---------- */
const firebaseConfig = {
  apiKey: "AIzaSyAeFVci5vIWgFI4Y3NNK8EPG3ttf0T_Xz0",
  authDomain: "test-f5cac.firebaseapp.com",
  projectId: "test-f5cac",
  storageBucket: "test-f5cac.appspot.com",
  messagingSenderId: "969104252032",
  appId: "1:969104252032:web:e5badacd03ac6c92139a65"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

/* ---------- DOM ---------- */
const container = document.getElementById("appointmentsContainer");
const sound = document.getElementById("notificationSound");

const staffFilter = document.getElementById("staffFilter");
const serviceFilter = document.getElementById("serviceFilter");
const timeFilter = document.getElementById("timeFilter");
const printBtn = document.getElementById("printBtn");

const calendarEl = document.getElementById("calendar");
const monthYearEl = document.getElementById("monthYear");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");

/* ---------- STATE ---------- */
let allAppointments = [];
let firstLoad = true;
let selectedDate = ""; // empty = show all
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

/* ---------- RENDER APPOINTMENTS ---------- */
function renderAppointments(list) {
  container.innerHTML = "";
  if (!list.length) {
    container.textContent = "No appointments found.";
    return;
  }

  list.forEach(a => {
    const status = a.status || "pending";
    const card = document.createElement("div");
    card.className = `appointment-card status-${status}`;

    const cleanPhone = a.phonenumber?.replace(/\D/g, "") || "";

    card.innerHTML = `
      <p><strong>${a.date} ${a.time}</strong> – ${a.name}</p>
      <p class="contact">
        📧 <a href="mailto:${a.email}">${a.email}</a><br>
        📞 <a href="tel:${cleanPhone}">${a.phonenumber}</a>
      </p>
      <p><strong>Services:</strong> ${a.services.map(s => s.name).join(", ")}</p>
      <p><strong>Staff:</strong> ${a.staff}</p>
      <label>
        Status:
        <select class="statusSelect" data-id="${a.id}">
          <option value="pending" ${status === "pending" ? "selected" : ""}>Pending</option>
          <option value="completed" ${status === "completed" ? "selected" : ""}>Completed</option>
          <option value="cancelled" ${status === "cancelled" ? "selected" : ""}>Cancelled</option>
        </select>
      </label>
    `;
    container.appendChild(card);
  });
}

/* ---------- FILTER OPTIONS ---------- */
function populateFilters() {
  const staffSet = new Set();
  const serviceSet = new Set();

  allAppointments.forEach(a => {
    if (a.staff) staffSet.add(a.staff);
    a.services.forEach(s => serviceSet.add(s.name));
  });

  staffFilter.innerHTML = `<option value="">All staff</option>`;
  serviceFilter.innerHTML = `<option value="">All services</option>`;
  [...staffSet].sort().forEach(s => staffFilter.innerHTML += `<option>${s}</option>`);
  [...serviceSet].sort().forEach(s => serviceFilter.innerHTML += `<option>${s}</option>`);
}

/* ---------- APPLY FILTER ---------- */
function applyFilter() {
  const staff = staffFilter.value;
  const service = serviceFilter.value;
  const view = timeFilter.value;
  const now = new Date();

  let filtered = allAppointments.filter(a => {
    const dt = new Date(`${a.date}T${a.time}`);
    if (selectedDate && a.date !== selectedDate) return false;
    if (staff && a.staff !== staff) return false;
    if (service && !a.services.some(s => s.name === service)) return false;
    if (view === "upcoming" && dt < now) return false;
    if (view === "past" && dt >= now) return false;
    return true;
  });

  filtered.sort((a, b) => `${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  renderAppointments(filtered);
}

/* ---------- STATUS UPDATE ---------- */
container.addEventListener("change", async e => {
  if (!e.target.classList.contains("statusSelect")) return;
  const id = e.target.dataset.id;
  const status = e.target.value;
  await updateDoc(doc(db, "appointments", id), { status });
});

/* ---------- PRINT ---------- */
printBtn.addEventListener("click", () => window.print());

/* ---------- REALTIME LISTENER ---------- */
const q = query(collection(db, "appointments"), orderBy("createdAt", "desc"));
onSnapshot(q, snap => {
  allAppointments = snap.docs.map(d => ({ id: d.id, ...d.data() }));
  populateFilters();
  applyFilter();
  if (!firstLoad && sound) {
    sound.currentTime = 0;
    sound.play();
  }
  firstLoad = false;
});

/* ---------- CALENDAR ---------- */
function renderCalendar() {
  calendarEl.innerHTML = "";
  const firstDay = new Date(currentYear, currentMonth, 1).getDay();
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  monthYearEl.textContent = new Date(currentYear, currentMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" });

  for (let i = 0; i < firstDay; i++) {
    const empty = document.createElement("div");
    empty.className = "empty";
    calendarEl.appendChild(empty);
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    const cell = document.createElement("div");
    cell.textContent = day;
    cell.className = "calendar-day";
    if (dateStr === selectedDate) cell.classList.add("selected");

    cell.addEventListener("click", () => {
      if (selectedDate === dateStr) selectedDate = ""; // toggle deselect
      else selectedDate = dateStr;
      renderCalendar();
      applyFilter();
    });

    calendarEl.appendChild(cell);
  }
}

prevMonthBtn.addEventListener("click", () => {
  currentMonth--;
  if (currentMonth < 0) { currentMonth = 11; currentYear--; }
  renderCalendar();
});

nextMonthBtn.addEventListener("click", () => {
  currentMonth++;
  if (currentMonth > 11) { currentMonth = 0; currentYear++; }
  renderCalendar();
});

/* ---------- FILTER EVENTS ---------- */
[staffFilter, serviceFilter, timeFilter].forEach(el => el.addEventListener("change", applyFilter));

/* ---------- INIT ---------- */
renderCalendar();
applyFilter();
