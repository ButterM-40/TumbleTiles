// App.js - Main application logic and UI handlers

let board;
let canvas, ctx;
let cellSize = 30;
let clickToAddMode = false;
let scriptRunning = false;
let scriptInterval = null;
let showLabels = true;
let showGlues = true;
let gluesActivated = false;
let quickAddMode = false;
let quickDeleteMode = false;
let isCtrlPressed = false;
let undoHistory = [];
const MAX_UNDO_HISTORY = 50;

// Zoom and pan variables
let zoom = 1.0;
let panX = 0;
let panY = 0;
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Initialize the application
function init() {
    canvas = document.getElementById('board-canvas');
    ctx = canvas.getContext('2d');
    
    // Create initial board
    const width = parseInt(document.getElementById('board-width').value);
    const height = parseInt(document.getElementById('board-height').value);
    board = new Board(height, width);
    
    // Set canvas size
    resizeCanvas();
    
    // Draw initial board
    drawBoard();
    
    // Setup event listeners
    setupEventListeners();
    
    // Update info
    updateInfo();
}

function resizeCanvas() {
    canvas.width = board.Cols * cellSize;
    canvas.height = board.Rows * cellSize;
}

function setupEventListeners() {
    // Settings panel controls
    document.getElementById('close-settings').addEventListener('click', () => {
        document.getElementById('control-panel').classList.add('hidden');
        document.querySelector('.main-content').classList.add('controls-hidden');
        document.getElementById('open-settings').style.display = 'block';
    });
    
    document.getElementById('open-settings').addEventListener('click', () => {
        document.getElementById('control-panel').classList.remove('hidden');
        document.querySelector('.main-content').classList.remove('controls-hidden');
        document.getElementById('open-settings').style.display = 'none';
    });
    
    // Board controls
    document.getElementById('resize-board').addEventListener('click', resizeBoardHandler);
    document.getElementById('clear-board').addEventListener('click', clearBoardHandler);
    document.getElementById('show-labels').addEventListener('change', (e) => {
        showLabels = e.target.checked;
        drawBoard();
    });
    document.getElementById('show-glues').addEventListener('change', (e) => {
        showGlues = e.target.checked;
        drawBoard();
    });
    
    // Factory mode toggle
    document.getElementById('factory-mode').addEventListener('change', (e) => {
        FACTORYMODE = e.target.checked;
        console.log('Factory mode:', FACTORYMODE ? 'enabled' : 'disabled');
    });
    
    // Tile controls
    document.getElementById('add-tile').addEventListener('click', addTileHandler);
    document.getElementById('toggle-click-mode').addEventListener('click', toggleClickMode);
    document.getElementById('toggle-add-mode').addEventListener('click', toggleAddMode);
    document.getElementById('toggle-delete-mode').addEventListener('click', toggleDeleteMode);
    
    // Keyboard controls for Ctrl key and shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.ctrlKey) {
            isCtrlPressed = true;
            
            // Ctrl+A to toggle add mode
            if (e.key === 'a' || e.key === 'A') {
                e.preventDefault();
                toggleAddMode();
            }
            // Ctrl+D to toggle delete mode
            if (e.key === 'd' || e.key === 'D') {
                e.preventDefault();
                toggleDeleteMode();
            }
            // Ctrl+Z for undo
            if (e.key === 'z' || e.key === 'Z') {
                e.preventDefault();
                undoAction();
            }
        }
    });
    
    document.addEventListener('keyup', (e) => {
        if (!e.ctrlKey) {
            isCtrlPressed = false;
        }
    });
    
    // Script preset selector
    document.getElementById('script-preset').addEventListener('change', (e) => {
        const preset = e.target.value;
        if (preset) {
            document.getElementById('script-input').value = preset;
        }
    });
    
    // Movement buttons
    document.querySelectorAll('.dir-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const direction = e.target.dataset.dir;
            tumbleDirection(direction);
        });
    });
    
    // Keyboard controls (WASD)
    document.addEventListener('keydown', handleKeyPress);
    
    // Undo button
    document.getElementById('undo-action').addEventListener('click', undoAction);
    
    document.getElementById('activate-glues').addEventListener('click', () => {
        if (gluesActivated) {
            // Deactivate: reload the board to reset glue connections
            const width = board.Cols;
            const height = board.Rows;
            const tiles = [];
            
            // Save current tiles
            for (let p of board.Polyominoes) {
                for (let tile of p.Tiles) {
                    tiles.push({
                        x: tile.x,
                        y: tile.y,
                        glues: [...tile.glues],
                        color: tile.color,
                        name: tile.name
                    });
                }
            }
            for (let tile of board.ConcreteTiles) {
                tiles.push({
                    x: tile.x,
                    y: tile.y,
                    glues: [...tile.glues],
                    color: tile.color,
                    name: tile.name,
                    isConcrete: true
                });
            }
            
            // Recreate board without activating glues
            board = new Board(height, width);
            for (let tileData of tiles) {
                if (tileData.isConcrete) {
                    board.AddConc(tileData.x, tileData.y, tileData.glues, tileData.color, tileData.name);
                } else {
                    const p = new Polyomino(board.getNextPolyId(), tileData.x, tileData.y, tileData.glues, tileData.color, tileData.name);
                    board.Add(p);
                }
            }
            
            gluesActivated = false;
        } else {
            // Activate glues
            board.ActivateGlues();
            gluesActivated = true;
        }
        updateGlueButtonState();
        drawBoard();
        updateInfo();
    });
    
    // Activate on load checkbox
    document.getElementById('activate-on-load').addEventListener('change', (e) => {
        gluesActivated = e.target.checked;
        updateGlueButtonState();
    });
    
    // Script controls
    document.getElementById('run-script').addEventListener('click', runScriptHandler);
    document.getElementById('stop-script').addEventListener('click', stopScriptHandler);
    
    // File controls
    document.getElementById('file-input').addEventListener('change', loadFileHandler);
    document.getElementById('load-file').addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const fileInput = document.getElementById('file-input');
        fileInput.value = ''; // Reset to allow loading the same file again
        fileInput.click();
        console.log('Load XML button clicked, opening file dialog');
    });
    document.getElementById('save-file').addEventListener('click', saveFileHandler);
    document.getElementById('load-example').addEventListener('click', loadExampleHandler);
    
    // Zoom controls
    document.getElementById('zoom-in').addEventListener('click', () => {
        zoom = Math.min(zoom * 1.2, 5.0);
        drawBoard();
    });
    document.getElementById('zoom-out').addEventListener('click', () => {
        zoom = Math.max(zoom / 1.2, 0.2);
        drawBoard();
    });
    document.getElementById('zoom-reset').addEventListener('click', () => {
        zoom = 1.0;
        panX = 0;
        panY = 0;
        drawBoard();
    });
    
    document.getElementById('center-board').addEventListener('click', centerBoardHandler);
    
    // Canvas mouse events for panning
    canvas.addEventListener('mousedown', canvasMouseDown);
    canvas.addEventListener('mousemove', canvasMouseMove);
    canvas.addEventListener('mouseup', canvasMouseUp);
    canvas.addEventListener('mouseleave', canvasMouseUp);
    canvas.addEventListener('wheel', canvasWheel);
    
    // Canvas click
    canvas.addEventListener('click', canvasClickHandler);
}

function resizeBoardHandler() {
    const width = parseInt(document.getElementById('board-width').value);
    const height = parseInt(document.getElementById('board-height').value);
    
    if (width < 5 || width > 200 || height < 5 || height > 200) {
        alert('Board dimensions must be between 5 and 200');
        return;
    }
    
    // Save current tiles
    const tiles = [];
    for (let p of board.Polyominoes) {
        for (let tile of p.Tiles) {
            if (tile.x < width && tile.y < height) {
                tiles.push({
                    x: tile.x,
                    y: tile.y,
                    color: tile.color,
                    glues: [...tile.glues],
                    name: tile.name
                });
            }
        }
    }
    
    for (let conc of board.ConcreteTiles) {
        if (conc.x < width && conc.y < height) {
            tiles.push({
                x: conc.x,
                y: conc.y,
                color: board.ConcreteColor,
                glues: [],
                name: conc.name,
                isConcrete: true
            });
        }
    }
    
    // Create new board
    board = new Board(height, width);
    
    // Re-add tiles
    for (let tileData of tiles) {
        if (tileData.isConcrete) {
            const t = new Tile(null, 0, tileData.x, tileData.y, [], tileData.color, true);
            t.name = tileData.name;
            board.AddConc(t);
        } else {
            const p = new Polyomino(board.poly_id_c++, tileData.x, tileData.y, tileData.glues, tileData.color);
            p.Tiles[0].name = tileData.name;
            board.Add(p);
        }
    }
    
    resizeCanvas();
    
    // Reset zoom and pan to center
    zoom = 1.0;
    panX = 0;
    panY = 0;
    
    drawBoard();
    updateInfo();
}

function clearBoardHandler() {
    if (confirm('Clear all tiles from the board?')) {
        board.clear();
        drawBoard();
        updateInfo();
    }
}

function centerBoardHandler() {
    // Calculate zoom to fit board in view with some padding
    const canvasContainer = document.querySelector('.canvas-panel');
    const containerWidth = canvasContainer.clientWidth - 40; // padding
    const containerHeight = canvasContainer.clientHeight - 40;
    
    const boardWidth = board.Cols * cellSize;
    const boardHeight = board.Rows * cellSize;
    
    const zoomX = containerWidth / boardWidth;
    const zoomY = containerHeight / boardHeight;
    
    // Use the smaller zoom to fit entire board
    zoom = Math.min(zoomX, zoomY, 1.0); // Don't zoom in beyond 1.0
    
    // Center the board
    panX = 0;
    panY = 0;
    
    drawBoard();
}

function addTileHandler() {
    const x = parseInt(document.getElementById('tile-x').value);
    const y = parseInt(document.getElementById('tile-y').value);
    const color = document.getElementById('tile-color').value;
    const name = document.getElementById('tile-name').value;
    const isConcrete = document.getElementById('tile-concrete').checked;
    
    const glues = [
        document.getElementById('glue-n').value || ' ',
        document.getElementById('glue-e').value || ' ',
        document.getElementById('glue-s').value || ' ',
        document.getElementById('glue-w').value || ' '
    ];
    
    if (x < 0 || x >= board.Cols || y < 0 || y >= board.Rows) {
        alert('Position is outside board boundaries');
        return;
    }
    
    if (board.coordToTile[x][y] !== null) {
        alert('A tile already exists at this position');
        return;
    }
    
    if (isConcrete) {
        const t = new Tile(null, 0, x, y, [], color, true);
        t.name = name;
        board.AddConc(t);
    } else {
        const p = new Polyomino(board.poly_id_c++, x, y, glues, color);
        p.Tiles[0].name = name;
        board.Add(p);
    }
    
    drawBoard();
    updateInfo();
}

function toggleClickMode() {
    clickToAddMode = !clickToAddMode;
    const btn = document.getElementById('toggle-click-mode');
    btn.textContent = clickToAddMode ? 'Disable Click-to-Add' : 'Enable Click-to-Add';
    btn.classList.toggle('active');
    
    const status = document.getElementById('canvas-status');
    status.textContent = clickToAddMode ? 'Click on canvas to add tiles' : '';
}

function toggleAddMode() {
    quickAddMode = !quickAddMode;
    if (quickAddMode) {
        quickDeleteMode = false; // Disable delete mode
        clickToAddMode = false; // Disable regular click-to-add
        const btn = document.getElementById('toggle-click-mode');
        btn.textContent = 'Enable Click-to-Add';
        btn.classList.remove('active');
    }
    updateModeButtons();
}

function toggleDeleteMode() {
    quickDeleteMode = !quickDeleteMode;
    if (quickDeleteMode) {
        quickAddMode = false; // Disable add mode
        clickToAddMode = false; // Disable regular click-to-add
        const btn = document.getElementById('toggle-click-mode');
        btn.textContent = 'Enable Click-to-Add';
        btn.classList.remove('active');
    }
    updateModeButtons();
}

function updateModeButtons() {
    const addBtn = document.getElementById('toggle-add-mode');
    const deleteBtn = document.getElementById('toggle-delete-mode');
    
    if (quickAddMode) {
        addBtn.classList.add('active');
        canvas.style.cursor = 'crosshair';
    } else {
        addBtn.classList.remove('active');
    }
    
    if (quickDeleteMode) {
        deleteBtn.classList.add('active');
        canvas.style.cursor = 'not-allowed';
    } else {
        deleteBtn.classList.remove('active');
    }
    
    if (!quickAddMode && !quickDeleteMode) {
        canvas.style.cursor = 'default';
    }
}

function canvasMouseDown(e) {
    // Don't pan in click-to-add mode or quick modes
    if (clickToAddMode || quickAddMode || quickDeleteMode) {
        if (quickAddMode) {
            addTileAtMouse(e);
        } else if (quickDeleteMode) {
            deleteTileAtMouse(e);
        }
        return;
    }
    
    isDragging = true;
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    canvas.style.cursor = 'grabbing';
}

function canvasMouseMove(e) {
    // Handle drag-to-add/delete in quick modes (no isDragging check needed)
    if (e.buttons === 1 && (quickAddMode || quickDeleteMode)) {
        if (quickAddMode) {
            addTileAtMouse(e);
        } else if (quickDeleteMode) {
            deleteTileAtMouse(e);
        }
        return;
    }
    
    if (!isDragging) return;
    
    const deltaX = e.clientX - lastMouseX;
    const deltaY = e.clientY - lastMouseY;
    
    panX += deltaX;
    panY += deltaY;
    
    lastMouseX = e.clientX;
    lastMouseY = e.clientY;
    
    drawBoard();
}

function canvasMouseUp(e) {
    isDragging = false;
    canvas.style.cursor = clickToAddMode ? 'crosshair' : 'grab';
}

function canvasWheel(e) {
    e.preventDefault();
    
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.2, Math.min(5.0, zoom * delta));
    
    // Zoom towards mouse position
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Adjust pan to zoom towards cursor
    panX = mouseX - (mouseX - panX) * (newZoom / zoom);
    panY = mouseY - (mouseY - panY) * (newZoom / zoom);
    
    zoom = newZoom;
    drawBoard();
}

function canvasClickHandler(e) {
    // Handle quick add mode
    if (quickAddMode) {
        addTileAtMouse(e);
        return;
    }
    
    // Handle quick delete mode
    if (quickDeleteMode) {
        deleteTileAtMouse(e);
        return;
    }
    
    // Regular click-to-add mode
    if (!clickToAddMode) return;
    if (isDragging) return; // Don't add tile if we were dragging
    
    addTileAtMouse(e);
}

function addTileAtMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert screen coordinates to board coordinates accounting for zoom and pan
    const boardX = (mouseX - panX) / zoom;
    const boardY = (mouseY - panY) / zoom;
    
    const gridX = Math.floor(boardX / cellSize);
    const gridY = Math.floor(boardY / cellSize);
    
    if (gridX < 0 || gridX >= board.Cols || gridY < 0 || gridY >= board.Rows) return;
    if (board.coordToTile[gridX][gridY] !== null) return;
    
    const name = document.getElementById('tile-name').value;
    const color = document.getElementById('tile-color').value;
    const isConcrete = document.getElementById('tile-concrete').checked;
    const glues = [
        document.getElementById('glue-n').value || ' ',
        document.getElementById('glue-e').value || ' ',
        document.getElementById('glue-s').value || ' ',
        document.getElementById('glue-w').value || ' '
    ];
    
    if (isConcrete) {
        const t = new Tile(null, 0, gridX, gridY, [], color, true);
        t.name = name;
        board.AddConc(t);
    } else {
        const p = new Polyomino(board.poly_id_c++, gridX, gridY, glues, color);
        p.Tiles[0].name = name;
        board.Add(p);
    }
    
    drawBoard();
    updateInfo();
}

function deleteTileAtMouse(e) {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;
    
    // Convert screen coordinates to board coordinates
    const boardX = (mouseX - panX) / zoom;
    const boardY = (mouseY - panY) / zoom;
    
    const gridX = Math.floor(boardX / cellSize);
    const gridY = Math.floor(boardY / cellSize);
    
    if (gridX < 0 || gridX >= board.Cols || gridY < 0 || gridY >= board.Rows) return;
    
    const tile = board.coordToTile[gridX][gridY];
    if (!tile) return;
    
    // Remove tile
    if (tile.isConcrete) {
        const index = board.ConcreteTiles.indexOf(tile);
        if (index > -1) {
            board.ConcreteTiles.splice(index, 1);
            board.coordToTile[gridX][gridY] = null;
        }
    } else {
        const parent = tile.parent;
        if (parent) {
            const tileIndex = parent.Tiles.indexOf(tile);
            if (tileIndex > -1) {
                parent.Tiles.splice(tileIndex, 1);
                board.coordToTile[gridX][gridY] = null;
            }
            // Remove empty polyominoes
            if (parent.Tiles.length === 0) {
                const polyIndex = board.Polyominoes.indexOf(parent);
                if (polyIndex > -1) {
                    board.Polyominoes.splice(polyIndex, 1);
                }
            }
        }
    }
    
    drawBoard();
    updateInfo();
}

function handleKeyPress(e) {
    // Ignore if user is typing in an input field
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
        return;
    }
    
    const key = e.key.toLowerCase();
    let direction = null;
    
    switch(key) {
        case 'w':
            direction = 'N';
            break;
        case 'a':
            direction = 'W';
            break;
        case 's':
            direction = 'S';
            break;
        case 'd':
            direction = 'E';
            break;
    }
    
    if (direction) {
        e.preventDefault(); // Prevent scrolling with WASD
        tumbleDirection(direction);
    }
}

function tumbleDirection(direction) {
    // Save current state before tumbling
    saveStateToHistory();
    
    board.Tumble(direction);
    drawBoard();
    updateInfo();
}

function saveStateToHistory() {
    const state = {
        polyominoes: board.Polyominoes.map(p => ({
            id: p.id,
            tiles: p.Tiles.map(t => ({
                x: t.x,
                y: t.y,
                glues: [...t.glues],
                color: t.color,
                name: t.name
            }))
        })),
        concreteTiles: board.ConcreteTiles.map(t => ({
            x: t.x,
            y: t.y,
            glues: [...t.glues],
            color: t.color,
            name: t.name
        })),
        width: board.Cols,
        height: board.Rows,
        gluesActivated: gluesActivated
    };
    
    undoHistory.push(state);
    
    // Limit history size
    if (undoHistory.length > MAX_UNDO_HISTORY) {
        undoHistory.shift();
    }
}

function undoAction() {
    if (undoHistory.length === 0) {
        console.log('No actions to undo');
        return;
    }
    
    const state = undoHistory.pop();
    
    // Restore board state
    board = new Board(state.width, state.height);
    
    // Restore polyominoes
    for (let pData of state.polyominoes) {
        const firstTile = pData.tiles[0];
        const p = new Polyomino(pData.id, firstTile.x, firstTile.y, firstTile.glues, firstTile.color);
        p.Tiles[0].name = firstTile.name;
        
        // Add remaining tiles
        for (let i = 1; i < pData.tiles.length; i++) {
            const tData = pData.tiles[i];
            const t = new Tile(p, pData.id, tData.x, tData.y, tData.glues, tData.color);
            t.name = tData.name;
            p.Tiles.push(t);
            board.coordToTile[tData.x][tData.y] = t;
        }
        
        board.Polyominoes.push(p);
        if (board.poly_id_c <= pData.id) {
            board.poly_id_c = pData.id + 1;
        }
    }
    
    // Restore concrete tiles
    for (let tData of state.concreteTiles) {
        const t = new Tile(null, 0, tData.x, tData.y, tData.glues, tData.color, true);
        t.name = tData.name;
        board.AddConc(t);
    }
    
    // Restore glues state
    gluesActivated = state.gluesActivated;
    updateGlueButtonState();
    
    drawBoard();
    updateInfo();
}

function runScriptHandler() {
    if (scriptRunning) {
        alert('Script is already running');
        return;
    }
    
    const script = document.getElementById('script-input').value.toUpperCase();
    const delay = parseInt(document.getElementById('script-delay').value);
    const loop = document.getElementById('script-loop').checked;
    
    if (!script) {
        alert('Please enter a script sequence');
        return;
    }
    
    // Validate script
    for (let char of script) {
        if (!'NESW'.includes(char)) {
            alert('Script can only contain N, E, S, W characters');
            return;
        }
    }
    
    scriptRunning = true;
    document.getElementById('run-script').disabled = true;
    
    let index = 0;
    scriptInterval = setInterval(() => {
        if (index >= script.length) {
            if (loop) {
                index = 0;
            } else {
                stopScriptHandler();
                return;
            }
        }
        
        const direction = script[index];
        tumbleDirection(direction);
        index++;
    }, delay);
}

function stopScriptHandler() {
    if (scriptInterval) {
        clearInterval(scriptInterval);
        scriptInterval = null;
    }
    scriptRunning = false;
    document.getElementById('run-script').disabled = false;
}

function drawBoard() {
    // Save context state
    ctx.save();
    
    // Clear canvas
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Apply zoom and pan transformations
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);
    
    // Draw grid
    ctx.strokeStyle = '#e0e0e0';
    ctx.lineWidth = 1 / zoom; // Keep line width consistent
    
    for (let i = 0; i <= board.Cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * cellSize, 0);
        ctx.lineTo(i * cellSize, board.Rows * cellSize);
        ctx.stroke();
    }
    
    for (let i = 0; i <= board.Rows; i++) {
        ctx.beginPath();
        ctx.moveTo(0, i * cellSize);
        ctx.lineTo(board.Cols * cellSize, i * cellSize);
        ctx.stroke();
    }
    
    // Draw tiles
    for (let p of board.Polyominoes) {
        for (let tile of p.Tiles) {
            drawTile(tile);
        }
    }
    
    // Draw concrete tiles
    for (let conc of board.ConcreteTiles) {
        drawTile(conc);
    }
    
    // Restore context state
    ctx.restore();
}

function drawTile(tile) {
    const x = tile.x * cellSize;
    const y = tile.y * cellSize;
    
    // Draw tile background
    ctx.fillStyle = tile.color;
    ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    
    // Draw border
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 2 / zoom; // Adjust line width for zoom
    ctx.strokeRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
    
    // Draw glues if not concrete and showGlues is enabled
    if (!tile.isConcrete && tile.glues && tile.glues.length === 4 && showGlues) {
        ctx.fillStyle = '#000000';
        ctx.font = `${10 / zoom}px Arial`; // Adjust font size for zoom
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // North
        if (tile.glues[0] && tile.glues[0] !== ' ') {
            ctx.fillText(tile.glues[0], x + cellSize / 2, y + 8);
        }
        // East
        if (tile.glues[1] && tile.glues[1] !== ' ') {
            ctx.fillText(tile.glues[1], x + cellSize - 8, y + cellSize / 2);
        }
        // South
        if (tile.glues[2] && tile.glues[2] !== ' ') {
            ctx.fillText(tile.glues[2], x + cellSize / 2, y + cellSize - 8);
        }
        // West
        if (tile.glues[3] && tile.glues[3] !== ' ') {
            ctx.fillText(tile.glues[3], x + 8, y + cellSize / 2);
        }
    }
    
    // Draw name if exists and labels are enabled
    if (tile.name && showLabels) {
        ctx.fillStyle = '#000000';
        ctx.font = `bold ${12 / zoom}px Arial`; // Adjust font size for zoom
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(tile.name, x + cellSize / 2, y + cellSize / 2);
    }
    
    // Draw concrete indicator
    if (tile.isConcrete) {
        ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
        ctx.fillRect(x + 1, y + 1, cellSize - 2, cellSize - 2);
        if (showLabels) {
            ctx.fillStyle = '#ffffff';
            ctx.font = `bold ${14 / zoom}px Arial`; // Adjust font size for zoom
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            ctx.fillText('C', x + cellSize / 2, y + cellSize / 2);
        }
    }
}

function updateInfo() {
    let tileCount = 0;
    for (let p of board.Polyominoes) {
        tileCount += p.Tiles.length;
    }
    tileCount += board.ConcreteTiles.length;
    
    document.getElementById('tile-count').textContent = tileCount;
    document.getElementById('poly-count').textContent = board.Polyominoes.length;
}

function updateGlueButtonState() {
    const btn = document.getElementById('activate-glues');
    if (gluesActivated) {
        btn.style.background = 'linear-gradient(135deg, #10b981 0%, #059669 100%)';
        btn.textContent = 'Glues Active ✓';
    } else {
        btn.style.background = 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)';
        btn.textContent = 'Activate Glues';
    }
}

function loadFileHandler() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    
    if (!file) {
        return; // No file selected yet
    }
    
    const reader = new FileReader();
    reader.onload = function(e) {
        const xmlText = e.target.result;
        parseXML(xmlText);
    };
    reader.readAsText(file);
}

function parseXML(xmlText) {
    try {
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, "text/xml");
        
        // Check for parsing errors
        const parserError = xmlDoc.getElementsByTagName('parsererror');
        if (parserError.length > 0) {
            alert('Error parsing XML file: ' + parserError[0].textContent);
            return;
        }
        
        // Clear current board
        board.clear();
        
        // Get board size (TileConfiguration format)
        const boardSizeElem = xmlDoc.getElementsByTagName('BoardSize')[0];
        if (boardSizeElem) {
            const width = parseInt(boardSizeElem.getAttribute('width'));
            const height = parseInt(boardSizeElem.getAttribute('height'));
            board.resizeBoard(width, height);
            document.getElementById('board-width').value = width;
            document.getElementById('board-height').value = height;
            resizeCanvas();
        }
        
        // Parse tiles (TileConfiguration format)
        const tileData = xmlDoc.getElementsByTagName('TileData')[0];
        if (tileData) {
            const tiles = tileData.getElementsByTagName('Tile');
            for (let tileElem of tiles) {
                // Get location
                const locationElem = tileElem.getElementsByTagName('Location')[0];
                if (!locationElem) continue;
                
                const x = parseInt(locationElem.getAttribute('x'));
                const y = parseInt(locationElem.getAttribute('y'));
                
                // Get color
                const colorElem = tileElem.getElementsByTagName('Color')[0];
                let color = colorElem ? '#' + colorElem.textContent : '#3498db';
                
                // Get glues
                const northGlueElem = tileElem.getElementsByTagName('NorthGlue')[0];
                const eastGlueElem = tileElem.getElementsByTagName('EastGlue')[0];
                const southGlueElem = tileElem.getElementsByTagName('SouthGlue')[0];
                const westGlueElem = tileElem.getElementsByTagName('WestGlue')[0];
                
                let glues = [' ', ' ', ' ', ' '];
                if (northGlueElem) {
                    const ng = northGlueElem.textContent;
                    glues[0] = (ng === 'None' || ng === '0') ? ' ' : ng;
                }
                if (eastGlueElem) {
                    const eg = eastGlueElem.textContent;
                    glues[1] = (eg === 'None' || eg === '0') ? ' ' : eg;
                }
                if (southGlueElem) {
                    const sg = southGlueElem.textContent;
                    glues[2] = (sg === 'None' || sg === '0') ? ' ' : sg;
                }
                if (westGlueElem) {
                    const wg = westGlueElem.textContent;
                    glues[3] = (wg === 'None' || wg === '0') ? ' ' : wg;
                }
                
                // Get concrete status
                const concreteElem = tileElem.getElementsByTagName('Concrete')[0];
                const isConcrete = concreteElem && concreteElem.textContent === 'True';
                
                // Get label
                const labelElem = tileElem.getElementsByTagName('Label')[0];
                const name = labelElem ? labelElem.textContent : '';
                
                // Add tile to board
                if (isConcrete) {
                    const t = new Tile(null, 0, x, y, [], color, true);
                    t.name = name;
                    board.AddConc(t);
                } else {
                    const p = new Polyomino(board.poly_id_c++, x, y, glues, color);
                    p.Tiles[0].name = name;
                    board.Add(p);
                }
            }
        }
        
        // Activate glues if checkbox is checked
        if (document.getElementById('activate-on-load').checked) {
            board.ActivateGlues();
            gluesActivated = true;
        } else {
            gluesActivated = false;
        }
        updateGlueButtonState();
        
        // Reset zoom and pan for new file
        zoom = 1.0;
        panX = 0;
        panY = 0;
        
        drawBoard();
        updateInfo();
        
        console.log('XML loaded successfully. Tiles:', board.Polyominoes.length + board.ConcreteTiles.length);
    } catch (error) {
        console.error('Error loading XML:', error);
        alert('Error loading XML file: ' + error.message);
    }
}

function saveFileHandler() {
    let xmlText = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xmlText += `<configuration>\n`;
    xmlText += `  <board width="${board.Cols}" height="${board.Rows}"/>\n`;
    xmlText += `  <tiles>\n`;
    
    // Save regular tiles
    for (let p of board.Polyominoes) {
        for (let tile of p.Tiles) {
            xmlText += `    <tile x="${tile.x}" y="${tile.y}" color="${tile.color}"`;
            if (tile.name) xmlText += ` name="${tile.name}"`;
            xmlText += `>\n`;
            
            if (tile.glues && tile.glues.length === 4) {
                if (tile.glues[0] && tile.glues[0] !== ' ') {
                    xmlText += `      <glue direction="N" label="${tile.glues[0]}"/>\n`;
                }
                if (tile.glues[1] && tile.glues[1] !== ' ') {
                    xmlText += `      <glue direction="E" label="${tile.glues[1]}"/>\n`;
                }
                if (tile.glues[2] && tile.glues[2] !== ' ') {
                    xmlText += `      <glue direction="S" label="${tile.glues[2]}"/>\n`;
                }
                if (tile.glues[3] && tile.glues[3] !== ' ') {
                    xmlText += `      <glue direction="W" label="${tile.glues[3]}"/>\n`;
                }
            }
            
            xmlText += `    </tile>\n`;
        }
    }
    
    // Save concrete tiles
    for (let conc of board.ConcreteTiles) {
        xmlText += `    <tile x="${conc.x}" y="${conc.y}" color="${conc.color}" concrete="true"`;
        if (conc.name) xmlText += ` name="${conc.name}"`;
        xmlText += `/>\n`;
    }
    
    xmlText += `  </tiles>\n`;
    xmlText += `</configuration>`;
    
    // Download file
    const blob = new Blob([xmlText], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tumbletiles_config.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

async function loadExampleHandler() {
    const exampleSelect = document.getElementById('example-select');
    const filename = exampleSelect.value;
    
    if (!filename) {
        alert('Please select an example from the dropdown');
        return;
    }
    
    try {
        // Fetch the example file from the Verification folder
        const response = await fetch(`../Verification/${filename}`);
        
        if (!response.ok) {
            throw new Error(`Failed to load example: ${response.statusText}`);
        }
        
        const xmlText = await response.text();
        
        // Parse and load the XML
        const parser = new DOMParser();
        const xmlDoc = parser.parseFromString(xmlText, 'text/xml');
        
        // Check for parsing errors
        const parserError = xmlDoc.querySelector('parsererror');
        if (parserError) {
            throw new Error('XML parsing error');
        }
        
        parseXML(xmlDoc);
        
        console.log(`Loaded example: ${filename}`);
    } catch (error) {
        console.error('Error loading example:', error);
        alert(`Failed to load example: ${error.message}`);
    }
}

// Initialize on page load
window.addEventListener('DOMContentLoaded', init);
