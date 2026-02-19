import { initializeApp } from "https://www.gstatic.com/firebasejs/12.8.0/firebase-app.js";
import {
  getFirestore, collection, query, orderBy, onSnapshot,
  doc, updateDoc, deleteDoc
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
const timeFilter = document.getElementById("timeFilter");
const printBtn = document.getElementById("printBtn");
const calendarEl = document.getElementById("calendar");
const monthYearEl = document.getElementById("monthYear");
const prevMonthBtn = document.getElementById("prevMonth");
const nextMonthBtn = document.getElementById("nextMonth");
const ctx = document.getElementById("busyChart");

/* Modal */
const modal = document.getElementById("modal");
const modalClose = document.getElementById("modalClose");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");

/* Edit Modal */
const editModal = document.getElementById("editModal");
const editModalClose = document.getElementById("editModalClose");
const editForm = document.getElementById("editForm");
let editingAppointmentId = null;

/* ---------- STATE ---------- */
let allAppointments = [];
let firstLoad = true;
let selectedDate = "";
let currentMonth = new Date().getMonth();
let currentYear = new Date().getFullYear();

/* ---------- BUSY CHART ---------- */
let busyChart;
const INTERVALS_PER_HOUR = 4;
const TOTAL_SLOTS = 24*INTERVALS_PER_HOUR;
let timeLabels = [];
let slotData = new Array(TOTAL_SLOTS).fill(0);

function generateTimeLabels() {
  timeLabels = [];
  for(let h=0;h<24;h++){
    for(let q=0;q<4;q++){
      timeLabels.push(`${String(h).padStart(2,"0")}:${String(q*15).padStart(2,"0")}`);
    }
  }
}

function createBusyChart(){
  busyChart = new Chart(ctx,{
    type:"bar",
    data:{labels:timeLabels,datasets:[{label:"Appointments per 15 min",data:slotData,backgroundColor:"rgba(248, 193, 193, 0.7)"}]},
    options:{
      responsive:true,
      scales:{x:{ticks:{maxRotation:90,minRotation:90,autoSkip:true,maxTicksLimit:24}},y:{beginAtZero:true,max:5}},
      plugins:{dragData:{round:0,showTooltip:true,onDragEnd:(e,datasetIndex,index,value)=>{slotData[index]=Math.max(0,value);busyChart.update();}}},
      onClick:(evt,elements)=>{
        if(!elements.length) return;
        const slotIndex = elements[0].index;
        showModalAppointments(slotIndex);
      }
    }
  });
}

function updateBusyChart(){
  slotData = new Array(TOTAL_SLOTS).fill(0);
  allAppointments.forEach(a=>{
    if(!a.time) return;
    if(selectedDate && a.date!==selectedDate) return;
    const [hStr,mStr]=a.time.split(":");
    const h=parseInt(hStr), m=parseInt(mStr);
    if(isNaN(h)||isNaN(m)) return;
    const slotIndex = h*4 + Math.floor(m/15);
    if(slotIndex>=0 && slotIndex<TOTAL_SLOTS) slotData[slotIndex]++;
  });
  busyChart.data.datasets[0].data = slotData;
  busyChart.update();
}

/* ---------- MODAL FUNCTIONS ---------- */
function showModalAppointments(slotIndex){
  const hour = Math.floor(slotIndex/4);
  const minutes = (slotIndex%4)*15;
  const slotTime = `${String(hour).padStart(2,"0")}:${String(minutes).padStart(2,"0")}`;

  const filtered = allAppointments.filter(a=> selectedDate?a.date===selectedDate && a.time===slotTime : a.time===slotTime );

  modalTitle.textContent = `Appointments at ${slotTime}${selectedDate?" on "+selectedDate:""}`;
  modalBody.innerHTML = "";

  if(!filtered.length){
    modalBody.innerHTML = "<p>No appointments in this slot.</p>";
  } else {
    filtered.forEach(a=>{
      const card=document.createElement("div");
      card.className=`appointment-card status-${a.status||"pending"}`;
      card.innerHTML=`
        <p><strong>${a.date} ${a.time}</strong> – ${a.name}</p>
        <p><strong>Phone:</strong> ${a.phonenumber || "-"}</p>
        <p><strong>Email:</strong> ${a.email || "-"}</p>
        <p><strong>Services:</strong> ${a.services.map(s=>s.name).join(", ")}</p>
        <p><strong>Staff:</strong> ${a.staff}</p>
        <p><strong>Message:</strong> ${a.message}</p>
        <label>Status:
          <select class="modalStatusSelect" data-id="${a.id}">
            <option value="pending" ${a.status==="pending"?"selected":""}>Pending</option>
            <option value="completed" ${a.status==="completed"?"selected":""}>Completed</option>
            <option value="cancelled" ${a.status==="cancelled"?"selected":""}>Cancelled</option>
          </select>
        </label>
        <button class="modalDeleteBtn" data-id="${a.id}" style="color:red;">Delete</button>
        <button class="editBtn" data-id="${a.id}">Edit</button>
      `;
      modalBody.appendChild(card);
    });
  }

  modal.style.display = "flex";
}

modalClose.addEventListener("click",()=>modal.style.display="none");
modal.addEventListener("click",(e)=>{if(e.target===modal) modal.style.display="none";});

/* ---------- EDIT APPOINTMENT ---------- */
function openEditModal(a){
  editingAppointmentId = a.id;
  editForm.date.value = a.date;
  editForm.time.value = a.time;
  editForm.name.value = a.name;
  editForm.phonenumber.value = a.phonenumber || "";
  editForm.email.value = a.email || "";
  editForm.staff.value = a.staff || "";
  editForm.services.value = a.services.map(s=>s.name).join(", ");
  editForm.message.value = a.message || "";
  editForm.status.value = a.status || "pending";
  editModal.style.display = "flex";
}

editForm.addEventListener("submit", async e=>{
  e.preventDefault();
  if(!editingAppointmentId) return;

  await updateDoc(doc(db,"appointments",editingAppointmentId),{
    date: editForm.date.value,
    time: editForm.time.value,
    name: editForm.name.value,
    phonenumber: editForm.phonenumber.value,
    email: editForm.email.value,
    staff: editForm.staff.value,
    services: editForm.services.value.split(",").map(s=>({name:s.trim()})),
    message: editForm.message.value,
    status: editForm.status.value
  });

  editModal.style.display = "none";
  editingAppointmentId = null;
});

/* ---------- CALENDAR ---------- */
function renderCalendar(){
  calendarEl.innerHTML="";
  const firstDay = new Date(currentYear,currentMonth,1).getDay();
  const daysInMonth = new Date(currentYear,currentMonth+1,0).getDate();
  monthYearEl.textContent=new Date(currentYear,currentMonth).toLocaleDateString("en-US",{month:"long",year:"numeric"});

  for(let i=0;i<firstDay;i++){
    const empty=document.createElement("div");
    empty.className="empty";
    calendarEl.appendChild(empty);
  }

  for(let day=1; day<=daysInMonth; day++){
    const dateStr=`${currentYear}-${String(currentMonth+1).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    const cell=document.createElement("div");
    cell.textContent=day;
    cell.className="calendar-day";
    if(dateStr===selectedDate) cell.classList.add("selected");

    cell.addEventListener("click", ()=>{
      selectedDate = selectedDate===dateStr?"":dateStr;
      renderCalendar();
      applyFilter();
    });

    calendarEl.appendChild(cell);
  }
}

/* ---------- RENDER APPOINTMENTS ---------- */
function renderAppointments(list){
  container.innerHTML="";
  if(!list.length){ container.textContent="No appointments found."; return; }
  list.forEach(a=>{
    const status=a.status||"pending";
    const card=document.createElement("div");
    card.className=`appointment-card status-${status}`;
    card.innerHTML=`
      <button class="deleteBtn" data-id="${a.id}">&times;</button>
      <p><strong>${a.date} ${a.time}</strong> – ${a.name}</p>
      <p><strong>Phone:</strong> ${a.phonenumber || "-"}</p>
      <p><strong>Email:</strong> ${a.email || "-"}</p>
      <p><strong>Services:</strong> ${a.services.map(s=>s.name).join(", ")}</p>
      <p><strong>Staff:</strong> ${a.staff}</p>
      <p><strong>Message:</strong> ${a.message}</p>
      <label>Status:
        <select class="statusSelect" data-id="${a.id}">
          <option value="pending" ${status==="pending"?"selected":""}>Pending</option>
          <option value="completed" ${status==="completed"?"selected":""}>Completed</option>
          <option value="cancelled" ${status==="cancelled"?"selected":""}>Cancelled</option>
        </select>
      </label>
      <button class="editBtn" data-id="${a.id}">Edit</button>
    `;
    container.appendChild(card);
  });
}

/* ---------- FILTER ---------- */
function applyFilter(){
  const view = timeFilter.value;
  const now = new Date();
  let filtered = allAppointments.filter(a=>{
    const dt = new Date(`${a.date}T${a.time}`);
    if(selectedDate && a.date!==selectedDate) return false;
    if(view==="upcoming" && dt<now) return false;
    if(view==="past" && dt>=now) return false;
    return true;
  });
  filtered.sort((a,b)=>`${a.date}T${a.time}`.localeCompare(`${b.date}T${b.time}`));
  renderAppointments(filtered);
  updateBusyChart();
}

/* ---------- FIRESTORE LISTENER ---------- */
const q = query(collection(db,"appointments"),orderBy("createdAt","desc"));
onSnapshot(q,snap=>{
  allAppointments = snap.docs.map(d=>({id:d.id,...d.data()}));
  applyFilter();
  firstLoad=false;
});

/* ---------- EVENTS ---------- */
prevMonthBtn.addEventListener("click",()=>{currentMonth--; if(currentMonth<0){currentMonth=11;currentYear--;} renderCalendar();});
nextMonthBtn.addEventListener("click",()=>{currentMonth++; if(currentMonth>11){currentMonth=0;currentYear++;} renderCalendar();});
timeFilter.addEventListener("change",applyFilter);
printBtn.addEventListener("click",()=>window.print());

container.addEventListener("change", async e=>{
  if(!e.target.classList.contains("statusSelect")) return;
  const id=e.target.dataset.id;
  await updateDoc(doc(db,"appointments",id),{status:e.target.value});
});

container.addEventListener("click", async e=>{
  const id=e.target.dataset.id;
  if(e.target.classList.contains("deleteBtn")){
    if(!confirm("Are you sure you want to delete this appointment?")) return;
    await deleteDoc(doc(db,"appointments",id));
  }
  if(e.target.classList.contains("editBtn")){
    const appointment = allAppointments.find(a=>a.id===id);
    if(!appointment) return;
    openEditModal(appointment);
  }
});

/* ---------- INIT ---------- */
generateTimeLabels();
createBusyChart();
renderCalendar();
applyFilter();
