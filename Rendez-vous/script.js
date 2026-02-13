/* =========================
   🔥 FIREBASE SETUP
========================= */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore,
  collection,
  addDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "test-f5cac.firebaseapp.com",
  projectId: "test-f5cac",
  storageBucket: "test-f5cac.firebasestorage.app",
  messagingSenderId: "969104252032",
  appId: "1:969104252032:web:e5badacd03ac6c92139a65"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const appointmentsRef = collection(db, "appointments");

/* =========================
   DOM ELEMENTS
========================= */
const form = document.getElementById("appointmentForm");
const calendar = document.getElementById("calendar");
const monthYear = document.getElementById("monthYear");
const prevMonth = document.getElementById("prevMonth");
const nextMonth = document.getElementById("nextMonth");
const timeSelect = document.getElementById("time");
const confirmation = document.getElementById("confirmation");

const nameInput = document.getElementById("name");
const emailInput = document.getElementById("email");
const phoneInput = document.getElementById("phonenumber");
const staffInput = document.getElementById("staff");
const messageInput = document.getElementById("message");

const serviceCards = document.querySelectorAll(".service-card");
const totalDurationEl = document.getElementById("totalDuration");
const totalPriceEl = document.getElementById("totalPrice");

/* =========================
   STATE
========================= */
let selectedServices = [];
let selectedDate = null;
let monthOffset = 0;

const SLOT_INTERVAL = 15;
const today = new Date();
today.setHours(0, 0, 0, 0);

/* =========================
   SERVICES
========================= */
function updateSummary() {
  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = selectedServices.reduce((sum, s) => sum + s.price, 0);

  totalDurationEl.textContent = totalDuration;
  totalPriceEl.textContent = totalPrice;
}

serviceCards.forEach(card => {
  card.addEventListener("click", () => {
    const service = {
      name: card.dataset.name,
      duration: Number(card.dataset.duration),
      price: Number(card.dataset.price)
    };

    card.classList.toggle("selected");

    if (card.classList.contains("selected")) {
      selectedServices.push(service);
    } else {
      selectedServices = selectedServices.filter(s => s.name !== service.name);
    }

    updateSummary();

    if (selectedDate) {
      populateTimes();
    }
  });
});

/* =========================
   CALENDAR
========================= */
function generateCalendar() {
  calendar.innerHTML = "";

  const date = new Date(today.getFullYear(), today.getMonth() + monthOffset, 1);

  monthYear.textContent = date.toLocaleString("default", {
    month: "long",
    year: "numeric"
  });

  const firstDay = date.getDay();
  const lastDate = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate();

  for (let i = 0; i < firstDay; i++) {
    calendar.appendChild(document.createElement("div"));
  }

  for (let d = 1; d <= lastDate; d++) {
    const dayDiv = document.createElement("div");
    dayDiv.className = "calendar-day";
    dayDiv.textContent = d;

    const fullDate = new Date(date.getFullYear(), date.getMonth(), d);

    if (fullDate < today) {
      dayDiv.classList.add("disabled");
    } else {
      dayDiv.addEventListener("click", () => {
        document.querySelectorAll(".calendar-day")
          .forEach(el => el.classList.remove("selected"));

        dayDiv.classList.add("selected");
        selectedDate = fullDate.toISOString().split("T")[0];
        timeSelect.disabled = false;
        populateTimes();
      });
    }

    calendar.appendChild(dayDiv);
  }
}

/* =========================
   WORKING HOURS
========================= */
function getWorkingHours(day) {
  // 0 = Sunday
  if (day === 0) return null;

  if (day >= 1 && day <= 3) {
    return { start: 9.5, end: 18 }; // Mon-Wed
  }

  if (day === 4 || day === 5) {
    return { start: 9.5, end: 20 }; // Thu-Fri
  }

  if (day === 6) {
    return { start: 9.5, end: 17 }; // Saturday
  }
}

/* =========================
   TIME SLOTS FIXED
========================= */
function populateTimes() {
  timeSelect.innerHTML = `<option disabled selected>Select time</option>`;

  if (!selectedDate) return;

  // Parse the date string safely into local time
  const [year, month, day] = selectedDate.split("-").map(Number);
  const dateObj = new Date(year, month - 1, day);

  const workingHours = getWorkingHours(dateObj.getDay());

  if (!workingHours) {
    const opt = document.createElement("option");
    opt.textContent = "Closed";
    opt.disabled = true;
    timeSelect.appendChild(opt);
    timeSelect.disabled = true;
    return;
  }

  const totalDuration = selectedServices.reduce((sum, s) => sum + s.duration, 0);

  // Loop through hours
  for (let hour = workingHours.start; hour < workingHours.end; hour += 0.5) {
    const h = Math.floor(hour);
    const m = (hour % 1 === 0.5 ? 30 : 0);

    const startTime = new Date(year, month - 1, day, h, m, 0);
    const endTime = new Date(startTime);
    endTime.setMinutes(endTime.getMinutes() + totalDuration);

    // Skip if endTime goes past working hours
    if ((endTime.getHours() + endTime.getMinutes() / 60) > workingHours.end) {
      continue;
    }

    const formatted = `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
    const option = document.createElement("option");
    option.value = formatted;
    option.textContent = formatted;

    timeSelect.appendChild(option);
  }

  timeSelect.disabled = false;
}


/* =========================
   NAVIGATION
========================= */
prevMonth.onclick = () => {
  monthOffset--;
  generateCalendar();
};

nextMonth.onclick = () => {
  monthOffset++;
  generateCalendar();
};

/* =========================
   SUBMIT
========================= */
form.addEventListener("submit", async e => {
  e.preventDefault();

  if (!selectedDate || !timeSelect.value || selectedServices.length === 0) {
    alert("Please complete all selections.");
    return;
  }

  try {
    await addDoc(appointmentsRef, {
      name: nameInput.value.trim(),
      email: emailInput.value.trim() || null,
      phonenumber: phoneInput.value.trim(),
      staff: staffInput.value.trim() || "Any",
      message: messageInput.value.trim() || null,
      date: selectedDate,
      time: timeSelect.value,
      services: selectedServices,
      totalDuration: selectedServices.reduce((s, x) => s + x.duration, 0),
      totalPrice: selectedServices.reduce((s, x) => s + x.price, 0),
      createdAt: Timestamp.now()
    });

    confirmation.textContent = "Appointment booked successfully ✨";

    form.reset();
    selectedServices = [];
    selectedDate = null;
    updateSummary();
    generateCalendar();
    timeSelect.disabled = true;

  } catch (error) {
    console.error("Booking error:", error);
    alert("Something went wrong. Please try again.");
  }
});

/* =========================
   INIT
========================= */
generateCalendar();
