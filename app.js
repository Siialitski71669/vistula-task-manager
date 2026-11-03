let SUPABASE_URL = "";
let SUPABASE_KEY = "";
let TABLE_NAME = "tasks";

const form = document.getElementById("task-form");
const titleInput = document.getElementById("task-title");
const descriptionInput = document.getElementById("task-description");
const taskList = document.getElementById("task-list");
const statusMessage = document.getElementById("status-message");

let tasks = [];
let editingId = null;

function showStatus(message) {
    statusMessage.textContent = message;
}

function apiUrl(path = "") {
    return `${SUPABASE_URL}/rest/v1/${TABLE_NAME}${path}`;
}

function headers(extra = {}) {
    return {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json",
        ...extra
    };
}

async function loadTasks() {
    try {
        const response = await fetch(apiUrl("?select=*&order=id.desc"), {
            headers: headers()
        });

        if (!response.ok) throw new Error(await response.text());

        tasks = await response.json();
        renderTasks();
        showStatus("Tasks loaded successfully.");
    } catch (error) {
        showStatus("Error loading tasks: " + error.message);
    }
}

function renderTasks() {
    taskList.innerHTML = "";

    tasks.forEach(task => {
        const item = document.createElement("div");
        item.className = "task-item";
        item.dataset.id = task.id;

        const title = document.createElement("p");
        title.className = "task-title";
        title.textContent = task.title;

        const description = document.createElement("p");
        description.className = "task-description";
        description.textContent = task.description || "";

        const status = document.createElement("p");
        status.className = "task-status";
        status.textContent = task.completed ? "Completed" : "Not completed";

        const toggleButton = document.createElement("button");
        toggleButton.className = "toggle-task";
        toggleButton.textContent = task.completed ? "Mark incomplete" : "Mark completed";
        toggleButton.addEventListener("click", () => toggleTask(task));

        const editButton = document.createElement("button");
        editButton.className = "edit-task";
        editButton.textContent = "Edit";
        editButton.addEventListener("click", () => editTask(task));

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-task";
        deleteButton.textContent = "Delete";
        deleteButton.addEventListener("click", () => deleteTask(task.id));

        item.append(title, description, status, toggleButton, editButton, deleteButton);
        taskList.appendChild(item);
    });
}

form.addEventListener("submit", async event => {
    event.preventDefault();

    const title = titleInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!title) return;

    try {
        let response;

        if (editingId !== null) {
            response = await fetch(apiUrl(`?id=eq.${editingId}`), {
                method: "PATCH",
                headers: headers({ Prefer: "return=representation" }),
                body: JSON.stringify({ title, description })
            });
        } else {
            response = await fetch(apiUrl(), {
                method: "POST",
                headers: headers({ Prefer: "return=representation" }),
                body: JSON.stringify({ title, description, completed: false })
            });
        }

        if (!response.ok) throw new Error(await response.text());

        form.reset();
        editingId = null;
        document.getElementById("task-submit").textContent = "Add Task";
        await loadTasks();
    } catch (error) {
        showStatus("Error saving task: " + error.message);
    }
});

function editTask(task) {
    titleInput.value = task.title;
    descriptionInput.value = task.description || "";
    editingId = task.id;
    document.getElementById("task-submit").textContent = "Save Changes";
    titleInput.focus();
}

async function toggleTask(task) {
    try {
        const response = await fetch(apiUrl(`?id=eq.${task.id}`), {
            method: "PATCH",
            headers: headers({ Prefer: "return=representation" }),
            body: JSON.stringify({ completed: !task.completed })
        });

        if (!response.ok) throw new Error(await response.text());
        await loadTasks();
    } catch (error) {
        showStatus("Error updating task: " + error.message);
    }
}

async function deleteTask(id) {
    if (!confirm("Are you sure you want to delete this task?")) return;

    try {
        const response = await fetch(apiUrl(`?id=eq.${id}`), {
            method: "DELETE",
            headers: headers()
        });

        if (!response.ok) throw new Error(await response.text());
        await loadTasks();
    } catch (error) {
        showStatus("Error deleting task: " + error.message);
    }
}

async function initialize() {
    try {
        const response = await fetch("./config.json");
        if (!response.ok) throw new Error("Cannot load config.json");

        const config = await response.json();

        SUPABASE_URL = config.supabaseUrl;
        SUPABASE_KEY = config.supabasePublishableKey;
        TABLE_NAME = config.tableName || "tasks";

        if (!SUPABASE_URL || !SUPABASE_KEY) {
            showStatus("Supabase is not configured yet.");
            return;
        }

        await loadTasks();
    } catch (error) {
        showStatus("Configuration error: " + error.message);
    }
}

initialize();
