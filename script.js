/****************************************************************************
 * VARIABLES GLOBALES Y ESTRUCTURAS DE DATOS
 ****************************************************************************/
let folders = [];               // [{ id, name, tasks[], isDefaultRewards }]
let currentFolderId = null;     // Carpeta actual
const rewardsFolderId = 'rewards-folder'; // ID para carpeta "Recompensas"

// DRAG & DROP
let draggedFolderId = null;     // Para folders
let draggedTaskId = null;       // Para tasks
let draggedStepIndex = null;    // Para steps

// PRESENTACIÓN
let presentationSteps = [];
let currentStepIndex = 0;
let timerSeconds = 0;
let timerInterval = null;

/****************************************************************************
 * ELEMENTOS DEL DOM
 ****************************************************************************/
const foldersSection = document.getElementById('foldersSection');
const newFolderInput = document.getElementById('newFolderInput');
const folderContainer = document.getElementById('folderContainer');

const tasksSection = document.getElementById('tasksSection');
const tasksTitle = document.getElementById('tasksTitle');
const newTaskInput = document.getElementById('newTaskInput');
const tasksList = document.getElementById('tasksList');

const presentationModal = document.getElementById('presentationModal');
const presentationStep = document.getElementById('presentationStep');
const timerDisplay = document.getElementById('timerDisplay');
const prevStepBtn = document.getElementById('prevStepBtn');
const nextStepBtn = document.getElementById('nextStepBtn');
const exitPresentationBtn = document.getElementById('exitPresentationBtn');

const rewardSection = document.getElementById('rewardSection');
const rewardInput = document.getElementById('rewardInput');

/****************************************************************************
 * EVENTOS DE INICIO
 ****************************************************************************/
window.addEventListener('load', () => {
  loadDataFromLocalStorage();
  ensureRewardsFolder();

  // Ver si el usuario vuelve a la app (popstate)
  window.addEventListener('popstate', handlePopState);

  renderFolders();
});

// Crear carpeta al presionar Enter
newFolderInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const name = newFolderInput.value.trim();
    if (name) {
      createFolder(name);
      newFolderInput.value = '';
    }
  }
});

// Crear tarea al presionar Enter
newTaskInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const taskName = newTaskInput.value.trim();
    if (taskName && currentFolderId) {
      createTask(currentFolderId, taskName);
      newTaskInput.value = '';
    }
  }
});

/* Presentación */
prevStepBtn.addEventListener('click', () => {
  if (currentStepIndex > 0) {
    currentStepIndex--;
    showPresentationStep();
  }
});
nextStepBtn.addEventListener('click', () => {
  if (currentStepIndex < presentationSteps.length - 1) {
    currentStepIndex++;
    showPresentationStep();
  }
});
exitPresentationBtn.addEventListener('click', closePresentation);

/* Recompensa */
rewardInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    const text = rewardInput.value.trim();
    if (text) {
      addReward(text);
      rewardInput.value = '';
      // Volver a la vista de TAREAS
      rewardSection.style.display = 'none';
      tasksSection.style.display = 'block';
    }
  }
});

/****************************************************************************
 * NAVEGACIÓN CON HISTORY (para usar botón Atrás del navegador/móvil)
 ****************************************************************************/
function handlePopState(event) {
  // Si hay un state con folderId, abrimos esa carpeta
  if (event.state && event.state.folderId) {
    openFolder(event.state.folderId, false); // false para no hacer otro pushState
  } else {
    // Sin state => mostrar la lista de carpetas
    showFolders();
  }
}

function showFolders() {
  tasksSection.style.display = 'none';
  rewardSection.style.display = 'none';
  foldersSection.style.display = 'block';
  currentFolderId = null;
}

/****************************************************************************
 * FUNCIONES DE CARPETAS
 ****************************************************************************/
function ensureRewardsFolder() {
  let rf = folders.find(f => f.id === rewardsFolderId);
  if (!rf) {
    rf = {
      id: rewardsFolderId,
      name: 'Recompensas',
      tasks: [],
      isDefaultRewards: true
    };
    folders.push(rf);
  }
}

function createFolder(name) {
  const folder = {
    id: generateId(),
    name,
    tasks: [],
    isDefaultRewards: false
  };
  folders.push(folder);
  saveDataToLocalStorage();
  renderFolders();
}

function renderFolders() {
  folderContainer.innerHTML = '';
  folders.forEach(folder => {
    // Carpeta
    const folderDiv = document.createElement('div');
    folderDiv.className = 'folder';
    folderDiv.dataset.id = folder.id;
    folderDiv.draggable = true;

    // Drag & drop
    folderDiv.addEventListener('dragstart', handleFolderDragStart);
    folderDiv.addEventListener('dragover', handleFolderDragOver);
    folderDiv.addEventListener('drop', handleFolderDrop);

    // Abrir carpeta
    folderDiv.addEventListener('click', () => {
      openFolder(folder.id); // pushState en openFolder
    });

    // Icono
    const folderIcon = document.createElement('div');
    folderIcon.className = 'folder-icon';

    // Nombre
    const folderName = document.createElement('div');
    folderName.className = 'folder-name';
    folderName.textContent = folder.name;

    // Opciones (si no es Recompensas)
    const folderOptions = document.createElement('div');
    folderOptions.className = 'folder-options';

    if (!folder.isDefaultRewards) {
      // Botón renombrar (✏)
      const renameBtn = document.createElement('button');
      renameBtn.textContent = '✏';
      renameBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renameFolder(folder);
      });

      // Botón eliminar (🗑)
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeFolder(folder.id);
      });

      folderOptions.appendChild(renameBtn);
      folderOptions.appendChild(deleteBtn);
    }

    folderDiv.appendChild(folderOptions);
    folderDiv.appendChild(folderIcon);
    folderDiv.appendChild(folderName);
    folderContainer.appendChild(folderDiv);
  });
}

function openFolder(folderId, pushToHistory = true) {
  currentFolderId = folderId;
  const folder = folders.find(f => f.id === folderId);

  tasksTitle.textContent = folder.name;
  foldersSection.style.display = 'none';
  rewardSection.style.display = 'none';
  tasksSection.style.display = 'block';
  renderTasks();

  // Agregamos entrada al history para usar "Atrás"
  if (pushToHistory) {
    history.pushState({ folderId }, '', '');
  }
}

function renameFolder(folder) {
  const newName = prompt(`Renombrar carpeta "${folder.name}" a:`);
  if (newName && newName.trim()) {
    folder.name = newName.trim();
    saveDataToLocalStorage();
    renderFolders();
  }
}

function removeFolder(folderId) {
  folders = folders.filter(f => f.id !== folderId);
  saveDataToLocalStorage();
  renderFolders();
}

/****************************************************************************
 * FUNCIONES DE TAREAS
 ****************************************************************************/
function createTask(folderId, taskName) {
  const folder = folders.find(f => f.id === folderId);
  if (!folder) return;
  const newTask = {
    id: generateId(),
    name: taskName,
    steps: []
  };
  folder.tasks.push(newTask);
  saveDataToLocalStorage();
  renderTasks();
}

function renderTasks() {
  const folder = folders.find(f => f.id === currentFolderId);
  if (!folder) return;

  tasksList.innerHTML = '';

  folder.tasks.forEach((task) => {
    // Tarea
    const taskDiv = document.createElement('div');
    taskDiv.className = 'task';
    taskDiv.dataset.taskId = task.id;
    taskDiv.draggable = true;

    // DRAG & DROP
    taskDiv.addEventListener('dragstart', handleTaskDragStart);
    taskDiv.addEventListener('dragover', handleTaskDragOver);
    taskDiv.addEventListener('drop', handleTaskDrop);

    // Encabezado (Nombre + Botones)
    const taskHeader = document.createElement('div');
    taskHeader.className = 'task-header';

    const taskNameText = document.createElement('span');
    taskNameText.className = 'task-name-text';
    taskNameText.textContent = task.name;

    // Botones de la tarea
    const taskButtons = document.createElement('div');
    taskButtons.className = 'task-buttons';

    if (!folder.isDefaultRewards) {
      // (✏) Editar nombre
      const editBtn = document.createElement('button');
      editBtn.textContent = '✏';
      editBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        renameTask(task);
      });

      // (↪) Mover
      const moveBtn = document.createElement('button');
      moveBtn.textContent = '↪';
      moveBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        inlineMoveTask(task);
      });

      // (▶) Play
      const playBtn = document.createElement('button');
      playBtn.textContent = '▶';
      playBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        startPresentation(task.steps);
      });

      // (✔) Check -> Recompensa
      const checkBtn = document.createElement('button');
      checkBtn.textContent = '✔';
      checkBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        openRewardSection();
      });

      // (🗑) Eliminar
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTask(folder, task.id);
      });

      taskButtons.appendChild(editBtn);
      taskButtons.appendChild(moveBtn);
      taskButtons.appendChild(playBtn);
      taskButtons.appendChild(checkBtn);
      taskButtons.appendChild(deleteBtn);

    } else {
      // En la carpeta de recompensas: solo eliminar
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = '🗑';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        removeTask(folder, task.id);
      });
      taskButtons.appendChild(deleteBtn);
    }

    taskHeader.appendChild(taskNameText);
    taskHeader.appendChild(taskButtons);

    // Contenedor de pasos (si NO es recompensas)
    let taskStepsDiv = null;
    if (!folder.isDefaultRewards) {
      taskStepsDiv = document.createElement('div');
      taskStepsDiv.className = 'task-steps';

      // Campo para agregar nuevo paso (Enter)
      const newStepContainer = document.createElement('div');
      newStepContainer.className = 'new-step-container';

      const newStepInput = document.createElement('input');
      newStepInput.type = 'text';
      newStepInput.placeholder = 'Nuevo paso (Enter)...';
      newStepInput.className = 'new-step-input';

      newStepInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          addNewStep(task, newStepInput);
        }
      });

      newStepContainer.appendChild(newStepInput);
      taskStepsDiv.appendChild(newStepContainer);

      // Lista de pasos
      task.steps.forEach((step, index) => {
        const stepDiv = document.createElement('div');
        stepDiv.className = 'step-item';
        stepDiv.dataset.stepIndex = index;
        stepDiv.draggable = true;

        // DRAG & DROP
        stepDiv.addEventListener('dragstart', handleStepDragStart);
        stepDiv.addEventListener('dragover', handleStepDragOver);
        stepDiv.addEventListener('drop', (e) => handleStepDrop(e, task));

        const stepTextSpan = document.createElement('span');
        stepTextSpan.className = 'step-text';
        stepTextSpan.textContent = step;

        // Botones del paso
        const stepButtons = document.createElement('div');
        stepButtons.className = 'step-buttons';

        // (✏) Editar
        const editStepBtn = document.createElement('button');
        editStepBtn.textContent = '✏';
        editStepBtn.addEventListener('click', () => {
          inlineEditStep(task, index);
        });

        // (🗑) Eliminar
        const deleteStepBtn = document.createElement('button');
        deleteStepBtn.textContent = '🗑';
        deleteStepBtn.addEventListener('click', () => {
          removeStep(task, index);
        });

        stepButtons.appendChild(editStepBtn);
        stepButtons.appendChild(deleteStepBtn);

        stepDiv.appendChild(stepTextSpan);
        stepDiv.appendChild(stepButtons);
        taskStepsDiv.appendChild(stepDiv);
      });
    }

    // Armado final
    taskDiv.appendChild(taskHeader);
    if (taskStepsDiv) taskDiv.appendChild(taskStepsDiv);
    tasksList.appendChild(taskDiv);
  });
}

function renameTask(task) {
  const newName = prompt(`Renombrar tarea "${task.name}" a:`);
  if (newName && newName.trim()) {
    task.name = newName.trim();
    saveDataToLocalStorage();
    renderTasks();
  }
}

function inlineMoveTask(task) {
  // Pequeño menú para mover la tarea a otra carpeta
  const moveContainer = document.createElement('div');
  moveContainer.style.backgroundColor = '#222';
  moveContainer.style.padding = '0.5rem';
  moveContainer.style.margin = '0.5rem 0';

  const folderSelect = document.createElement('select');
  folders.forEach(f => {
    if (f.id !== currentFolderId) {
      const opt = document.createElement('option');
      opt.value = f.id;
      opt.textContent = f.name;
      folderSelect.appendChild(opt);
    }
  });

  const moveBtn = document.createElement('button');
  moveBtn.textContent = '↪';
  moveBtn.style.marginLeft = '0.5rem';

  moveBtn.addEventListener('click', () => {
    doMoveTask(task, folderSelect.value);
    moveContainer.remove();
  });

  moveContainer.appendChild(folderSelect);
  moveContainer.appendChild(moveBtn);

  tasksList.prepend(moveContainer);
}

function doMoveTask(task, targetFolderId) {
  const currentFolder = folders.find(f => f.id === currentFolderId);
  const targetFolder = folders.find(f => f.id === targetFolderId);

  if (!currentFolder || !targetFolder) return;

  // Quitar de la carpeta actual
  currentFolder.tasks = currentFolder.tasks.filter(t => t.id !== task.id);
  // Agregar a la carpeta destino
  targetFolder.tasks.push(task);

  saveDataToLocalStorage();
  renderTasks();
}

function removeTask(folder, taskId) {
  folder.tasks = folder.tasks.filter(t => t.id !== taskId);
  saveDataToLocalStorage();
  renderTasks();
}

/****************************************************************************
 * PASOS
 ****************************************************************************/
function addNewStep(task, inputElem) {
  const stepText = inputElem.value.trim();
  if (stepText) {
    task.steps.push(stepText);
    inputElem.value = '';
    saveDataToLocalStorage();
    renderTasks();
  }
}

function removeStep(task, stepIndex) {
  task.steps.splice(stepIndex, 1);
  saveDataToLocalStorage();
  renderTasks();
}

function inlineEditStep(task, stepIndex) {
  const newStep = prompt('Editar paso:', task.steps[stepIndex]);
  if (newStep && newStep.trim()) {
    task.steps[stepIndex] = newStep.trim();
    saveDataToLocalStorage();
    renderTasks();
  }
}

/****************************************************************************
 * PRESENTACIÓN
 ****************************************************************************/
function startPresentation(steps) {
  if (!steps || steps.length === 0) return;
  presentationSteps = steps;
  currentStepIndex = 0;
  presentationModal.style.display = 'flex';
  showPresentationStep();
  startTimer();
}
function showPresentationStep() {
  presentationStep.textContent = presentationSteps[currentStepIndex];
}
function startTimer() {
  timerSeconds = 0;
  timerDisplay.textContent = formatTime(timerSeconds);
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = setInterval(() => {
    timerSeconds++;
    timerDisplay.textContent = formatTime(timerSeconds);
  }, 1000);
}
function closePresentation() {
  presentationModal.style.display = 'none';
  if (timerInterval) clearInterval(timerInterval);
  timerInterval = null;
  timerSeconds = 0;
  timerDisplay.textContent = '00:00';
}
function formatTime(sec) {
  const mins = Math.floor(sec / 60);
  const secs = sec % 60;
  return `${mins < 10 ? '0' : ''}${mins}:${secs < 10 ? '0' : ''}${secs}`;
}

/****************************************************************************
 * RECOMPENSAS
 ****************************************************************************/
function openRewardSection() {
  tasksSection.style.display = 'none';
  rewardSection.style.display = 'block';
}
function addReward(text) {
  const rewardsFolder = folders.find(f => f.id === rewardsFolderId);
  if (rewardsFolder) {
    rewardsFolder.tasks.push({
      id: generateId(),
      name: `Recompensa: ${text}`,
      steps: []
    });
    saveDataToLocalStorage();
  }
}

/****************************************************************************
 * DRAG & DROP CARPETAS
 ****************************************************************************/
function handleFolderDragStart(e) {
  draggedFolderId = e.currentTarget.dataset.id;
}
function handleFolderDragOver(e) {
  e.preventDefault();
}
function handleFolderDrop(e) {
  e.preventDefault();
  const targetFolderId = e.currentTarget.dataset.id;
  if (!targetFolderId || targetFolderId === draggedFolderId) return;

  const draggedIndex = folders.findIndex(f => f.id === draggedFolderId);
  const targetIndex = folders.findIndex(f => f.id === targetFolderId);
  if (draggedIndex > -1 && targetIndex > -1) {
    const temp = folders[draggedIndex];
    folders[draggedIndex] = folders[targetIndex];
    folders[targetIndex] = temp;
    saveDataToLocalStorage();
    renderFolders();
  }
}

/****************************************************************************
 * DRAG & DROP TAREAS
 ****************************************************************************/
function handleTaskDragStart(e) {
  draggedTaskId = e.currentTarget.dataset.taskId;
}
function handleTaskDragOver(e) {
  e.preventDefault();
}
function handleTaskDrop(e) {
  e.preventDefault();
  const targetTaskId = e.currentTarget.dataset.taskId;
  if (!targetTaskId || targetTaskId === draggedTaskId) return;

  const folder = folders.find(f => f.id === currentFolderId);
  if (!folder) return;

  const draggedIndex = folder.tasks.findIndex(t => t.id === draggedTaskId);
  const targetIndex = folder.tasks.findIndex(t => t.id === targetTaskId);

  if (draggedIndex > -1 && targetIndex > -1) {
    const temp = folder.tasks[draggedIndex];
    folder.tasks[draggedIndex] = folder.tasks[targetIndex];
    folder.tasks[targetIndex] = temp;
    saveDataToLocalStorage();
    renderTasks();
  }
}

/****************************************************************************
 * DRAG & DROP PASOS
 ****************************************************************************/
function handleStepDragStart(e) {
  draggedStepIndex = parseInt(e.currentTarget.dataset.stepIndex);
}
function handleStepDragOver(e) {
  e.preventDefault();
}
function handleStepDrop(e, task) {
  e.preventDefault();
  const targetStepIndex = parseInt(e.currentTarget.dataset.stepIndex);
  if (targetStepIndex === draggedStepIndex || isNaN(targetStepIndex)) return;

  const temp = task.steps[draggedStepIndex];
  task.steps[draggedStepIndex] = task.steps[targetStepIndex];
  task.steps[targetStepIndex] = temp;
  saveDataToLocalStorage();
  renderTasks();
}

/****************************************************************************
 * LOCAL STORAGE
 ****************************************************************************/
function saveDataToLocalStorage() {
  localStorage.setItem('foldersDataV4', JSON.stringify(folders));
}
function loadDataFromLocalStorage() {
  const data = localStorage.getItem('foldersDataV4');
  if (data) {
    folders = JSON.parse(data);
  } else {
    folders = [];
  }
}

/****************************************************************************
 * UTILIDADES
 ****************************************************************************/
function generateId() {
  return '_' + Math.random().toString(36).substr(2, 9);
}
