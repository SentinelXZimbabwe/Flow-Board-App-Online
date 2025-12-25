const boardEl = document.getElementById("board");

const taskModal = document.getElementById("taskModal");
const columnModal = document.getElementById("columnModal");

const openTaskModal = document.getElementById("openTaskModal");
const closeTaskModal = document.getElementById("closeTaskModal");
const saveTaskBtn = document.getElementById("saveTask");

const openColumnModal = document.getElementById("openColumnModal");
const closeColumnModal = document.getElementById("closeColumnModal");
const saveColumnBtn = document.getElementById("saveColumn");

const taskTitle = document.getElementById("taskTitle");
const taskColumn = document.getElementById("taskColumn");
const taskStart = document.getElementById("taskStart");
const taskDue = document.getElementById("taskDue");
const colorPicker = document.getElementById("colorPicker");

const columnName = document.getElementById("columnName");

const exportBtn = document.getElementById("exportBtn");
const exportFormat = document.getElementById("exportFormat");
const importInput = document.getElementById("importInput");

const STORAGE = "flowboard_final_locked";

const SYSTEM_COLUMNS = ["To Do","In Progress","Done"];
const COLORS = ["#1e40af","#065f46","#92400e","#7f1d1d","#4c1d95","#1f2937"];

let selectedColor = COLORS[0];

const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

let state = JSON.parse(localStorage.getItem(STORAGE)) || {
  columns: SYSTEM_COLUMNS.map(t => ({ id: uid(), title: t, tasks: [] }))
};

const save = () => localStorage.setItem(STORAGE, JSON.stringify(state));

/* ---------- MODALS ---------- */

openTaskModal.onclick = () => {
  taskModal.classList.remove("hidden");
  taskColumn.innerHTML = "";
  state.columns.forEach(c => {
    const o = document.createElement("option");
    o.value = c.id;
    o.textContent = c.title;
    taskColumn.appendChild(o);
  });
  buildColors();
};

closeTaskModal.onclick = () => taskModal.classList.add("hidden");

openColumnModal.onclick = () => columnModal.classList.remove("hidden");
closeColumnModal.onclick = () => columnModal.classList.add("hidden");

/* ---------- COLORS ---------- */

function buildColors(){
  colorPicker.innerHTML = "";
  COLORS.forEach(c => {
    const d = document.createElement("div");
    d.className = "color" + (c === selectedColor ? " active" : "");
    d.style.background = c;
    d.onclick = () => { selectedColor = c; buildColors(); };
    colorPicker.appendChild(d);
  });
}

/* ---------- SAVE TASK ---------- */

saveTaskBtn.onclick = () => {
  if (!taskTitle.value || !taskStart.value || !taskDue.value) return;

  const col = state.columns.find(c => c.id === taskColumn.value);

  col.tasks.push({
    id: uid(),
    title: taskTitle.value,
    color: selectedColor,
    created: new Date().toLocaleString(),
    start: taskStart.value,
    due: taskDue.value,
    completed: false
  });

  taskTitle.value = "";
  taskStart.value = "";
  taskDue.value = "";
  selectedColor = COLORS[0];

  taskModal.classList.add("hidden");
  render();
};

/* ---------- SAVE COLUMN ---------- */

saveColumnBtn.onclick = () => {
  if (!columnName.value) return;
  state.columns.push({ id: uid(), title: columnName.value, tasks: [] });
  columnName.value = "";
  columnModal.classList.add("hidden");
  render();
};

/* ---------- RENDER ---------- */

function render(){
  boardEl.innerHTML = "";
  const now = new Date();

  state.columns.forEach(col => {
    const c = document.createElement("div");
    c.className = "column";

    const h = document.createElement("div");
    h.className = "column-header";
    h.innerHTML = col.title;

    const b = document.createElement("div");
    b.className = "column-body";

    col.tasks.forEach(t => {
      const overdue = now > new Date(t.due) && !t.completed;
      const el = document.createElement("div");
      el.className = "task" + (overdue ? " overdue" : "");
      el.style.background = t.color;

      el.innerHTML = `
        <strong>${t.title}</strong>
        <small>Start: ${t.start}</small>
        <small>Due: ${t.due}</small>
        ${overdue ? `<div class="overdue-label">DUE DATE PASSED</div>` : ""}
        <div class="task-actions">
          ${col.title === "To Do" ? `<button onclick="sendToProgress('${t.id}')">➡️ Progress</button>` : ""}
          ${col.title !== "Done" ? `<button onclick="completeTask('${t.id}')">✅ Done</button>` : ""}
          <button onclick="deleteTask('${col.id}','${t.id}')">🗑️</button>
        </div>
      `;
      b.appendChild(el);
    });

    c.append(h, b);
    boardEl.appendChild(c);
  });

  save();
}

/* ---------- TASK MOVES ---------- */

window.sendToProgress = id => moveTask(id, "In Progress");
window.completeTask = id => moveTask(id, "Done", true);

function moveTask(id, target, complete = false){
  const dest = state.columns.find(c => c.title === target);
  state.columns.forEach(c => {
    const i = c.tasks.findIndex(t => t.id === id);
    if (i > -1) {
      const [t] = c.tasks.splice(i, 1);
      if (complete) t.completed = true;
      dest.tasks.push(t);
    }
  });
  render();
}

window.deleteTask = (cid, tid) => {
  const c = state.columns.find(c => c.id === cid);
  c.tasks = c.tasks.filter(t => t.id !== tid);
  render();
};

/* ---------- EXPORT ---------- */

exportBtn.onclick = () => {
  const f = exportFormat.value;
  if (f === "json") download(JSON.stringify(state, null, 2), "flowboard.json", "application/json");
  if (f === "txt") exportTXT();
  if (f === "csv") exportCSV();
  if (f === "pdf") exportPDF();
};

function download(data, name, type){
  const b = new Blob([data], { type });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(b);
  a.download = name;
  a.click();
}

function exportTXT(){
  let t = "";
  state.columns.forEach(c => {
    t += `\n${c.title}\n`;
    c.tasks.forEach(task => t += `- ${task.title}\n`);
  });
  download(t, "flowboard.txt", "text/plain");
}

function exportCSV(){
  let c = "Column,Task,Start,Due\n";
  state.columns.forEach(col =>
    col.tasks.forEach(t =>
      c += `"${col.title}","${t.title}","${t.start}","${t.due}"\n`
    )
  );
  download(c, "flowboard.csv", "text/csv");
}

function exportPDF(){
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();
  let y = 10;
  doc.text("FlowBoard Export", 10, y);
  y += 10;
  state.columns.forEach(col => {
    doc.text(col.title, 10, y);
    y += 6;
    col.tasks.forEach(t => {
      doc.text(`- ${t.title}`, 12, y);
      y += 5;
    });
    y += 4;
  });
  doc.save("flowboard.pdf");
}

/* ---------- IMPORT ---------- */

importInput.onchange = e => {
  const f = e.target.files[0];
  if (!f || !f.name.endsWith(".json")) return;
  const r = new FileReader();
  r.onload = () => {
    try {
      const d = JSON.parse(r.result);
      if (!Array.isArray(d.columns)) throw 0;
      state = d;
      render();
    } catch {
      alert("Invalid FlowBoard file");
    }
  };
  r.readAsText(f);
};

render();