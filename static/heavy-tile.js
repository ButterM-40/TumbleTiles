(function () {
    const DEFAULT_WEIGHT = 4;
    const MIN_WEIGHT = 1;
    const MAX_WEIGHT = 50;
    const DEFAULT_HEAVY = false;

    function getWeightInput() {
        return document.getElementById('tile-weight');
    }

    function getHeavyToggle() {
        return document.getElementById('tile-heavy');
    }

    function normalizeWeight(value) {
        const parsed = parseInt(value, 10);
        if (Number.isNaN(parsed)) {
            return DEFAULT_WEIGHT;
        }
        return Math.max(MIN_WEIGHT, Math.min(MAX_WEIGHT, parsed));
    }

    function normalizeHeavy(value) {
        return value === true;
    }

    function currentWeight() {
        const input = getWeightInput();
        if (!input) return DEFAULT_WEIGHT;
        const weight = normalizeWeight(input.value);
        input.value = String(weight);
        return weight;
    }

    function currentHeavy() {
        const toggle = getHeavyToggle();
        if (!toggle) return DEFAULT_HEAVY;
        return toggle.checked;
    }

    function ensureTileSettings(tile, fallbackWeight, fallbackHeavy) {
        if (!tile) return;
        const fallback = fallbackWeight === undefined ? currentWeight() : fallbackWeight;
        tile.weight = normalizeWeight(tile.weight === undefined ? fallback : tile.weight);
        const heavyFallback = fallbackHeavy === undefined ? DEFAULT_HEAVY : fallbackHeavy;
        tile.isHeavy = normalizeHeavy(tile.isHeavy === undefined ? heavyFallback : tile.isHeavy);
    }

    function ensureBoardTileSettings(weightHint, heavyHint) {
        if (!board) return;
        const fallback = normalizeWeight(weightHint === undefined ? currentWeight() : weightHint);
        const heavyFallback = heavyHint === undefined ? DEFAULT_HEAVY : normalizeHeavy(heavyHint);

        for (const p of board.Polyominoes) {
            for (const tile of p.Tiles) {
                ensureTileSettings(tile, fallback, heavyFallback);
            }
        }
        for (const tile of board.ConcreteTiles) {
            ensureTileSettings(tile, fallback, heavyFallback);
        }
    }

    function getPolyStepLimit(poly) {
        let hasHeavyTile = false;
        let minWeight = Infinity;

        for (const tile of poly.Tiles) {
            ensureTileSettings(tile);
            if (tile.isHeavy) {
                hasHeavyTile = true;
                minWeight = Math.min(minWeight, tile.weight);
            }
        }

        if (!hasHeavyTile) {
            return Infinity;
        }
        return Number.isFinite(minWeight) ? minWeight : DEFAULT_WEIGHT;
    }

    const originalAdd = Board.prototype.Add;
    Board.prototype.Add = function (p) {
        if (p && p.Tiles && p.Tiles[0]) {
            ensureTileSettings(p.Tiles[0], currentWeight(), currentHeavy());
        }
        return originalAdd.call(this, p);
    };

    const originalAddConc = Board.prototype.AddConc;
    Board.prototype.AddConc = function (t) {
        ensureTileSettings(t, currentWeight(), currentHeavy());
        return originalAddConc.call(this, t);
    };

    Board.prototype.Step = function (direction) {
        for (const p of this.Polyominoes) {
            p.HasMoved = Number.isFinite(p._heavyRemaining) && p._heavyRemaining <= 0;
        }

        let stepTaken = false;
        let dx = 0;
        let dy = 0;
        let wallindex = 0;

        if (direction === "N") {
            wallindex = -1;
            dy = -1;
        } else if (direction === "S") {
            wallindex = this.Rows;
            dy = 1;
        } else if (direction === "W") {
            wallindex = -1;
            dx = -1;
        } else if (direction === "E") {
            wallindex = this.Cols;
            dx = 1;
        }

        let anyMarked = true;
        while (anyMarked) {
            anyMarked = false;

            for (const p of this.Polyominoes) {
                if (p.HasMoved) continue;

                for (const tile of p.Tiles) {
                    if ((direction === "N" || direction === "S") && tile.y + dy === wallindex) {
                        anyMarked = true;
                        p.HasMoved = true;
                    }

                    if ((direction === "W" || direction === "E") && tile.x + dx === wallindex) {
                        anyMarked = true;
                        p.HasMoved = true;
                    }

                    try {
                        const neighbor = this.coordToTile[tile.x + dx][tile.y + dy];
                        if (neighbor && (neighbor.isConcrete || neighbor.parent.HasMoved)) {
                            anyMarked = true;
                            p.HasMoved = true;
                        }
                    } catch (_e) {
                        // Keep behavior aligned with existing board logic.
                    }
                }
            }
        }

        for (const p of this.Polyominoes) {
            if (!p.HasMoved) {
                p.HasMoved = true;
                stepTaken = true;

                for (const tile of p.Tiles) {
                    this.coordToTile[tile.x][tile.y] = null;
                }

                for (const tile of p.Tiles) {
                    tile.x += dx;
                    tile.y += dy;
                    this.coordToTile[tile.x][tile.y] = tile;
                }

                if (Number.isFinite(p._heavyRemaining)) {
                    p._heavyRemaining -= 1;
                }
            }
        }

        for (const p of this.Polyominoes) {
            for (const tile of p.Tiles) {
                this.coordToTile[tile.x][tile.y] = tile;
            }
        }

        return stepTaken;
    };

    Board.prototype.Tumble = function (direction) {
        if (!["N", "S", "E", "W"].includes(direction)) {
            return;
        }

        for (const p of this.Polyominoes) {
            p._heavyRemaining = getPolyStepLimit(p);
        }

        let stepTaken = this.Step(direction);
        while (stepTaken) {
            stepTaken = this.Step(direction);
        }

        for (const p of this.Polyominoes) {
            delete p._heavyRemaining;
        }

        if (FACTORYMODE) {
            const tilesToRemove = [];

            for (const p of this.Polyominoes) {
                for (const tile of p.Tiles) {
                    if (tile.x <= 0 || tile.x >= this.Cols - 1 || tile.y <= 0 || tile.y >= this.Rows - 1) {
                        tilesToRemove.push({ poly: p, tile: tile });
                    }
                }
            }

            for (const item of tilesToRemove) {
                const tileIndex = item.poly.Tiles.indexOf(item.tile);
                if (tileIndex > -1) {
                    item.poly.Tiles.splice(tileIndex, 1);
                    this.coordToTile[item.tile.x][item.tile.y] = null;
                }
            }

            this.Polyominoes = this.Polyominoes.filter(p => p.Tiles.length > 0);
        }

        this.ActivateGlues();
    };

    // ---- Fix 1: Undo — preserve isHeavy and weight ----
    //
    // A parallel stack that mirrors undoHistory (in app.js), storing only the
    // heavy/weight snapshot so it can be restored after an undo.

    const heavyUndoHistory = [];

    if (typeof window.saveStateToHistory === 'function') {
        const originalSaveState = window.saveStateToHistory;
        window.saveStateToHistory = function (...args) {
            originalSaveState.apply(this, args);
            if (!board) return;

            // Mirror the skip condition from app.js so both stacks stay in sync.
            const totalTiles = board.Polyominoes.reduce((n, p) => n + p.Tiles.length, 0)
                             + board.ConcreteTiles.length;
            if (totalTiles > 5000) return;

            const snapshot = {};
            for (const p of board.Polyominoes) {
                for (const t of p.Tiles) {
                    snapshot[`${t.x},${t.y}`] = { isHeavy: t.isHeavy === true, weight: normalizeWeight(t.weight) };
                }
            }
            for (const t of board.ConcreteTiles) {
                snapshot[`${t.x},${t.y}`] = { isHeavy: t.isHeavy === true, weight: normalizeWeight(t.weight) };
            }
            heavyUndoHistory.push(snapshot);

            const maxHistory = totalTiles > 2000 ? 10 : 50; // matches app.js MAX_UNDO_HISTORY
            if (heavyUndoHistory.length > maxHistory) heavyUndoHistory.shift();
        };
    }

    if (typeof window.undoAction === 'function') {
        const originalUndoAction = window.undoAction;
        window.undoAction = function (...args) {
            originalUndoAction.apply(this, args);
            if (!board) return;

            if (heavyUndoHistory.length === 0) {
                // Nothing was actually undone; just ensure tiles have valid defaults.
                ensureBoardTileSettings(currentWeight(), DEFAULT_HEAVY);
                return;
            }

            const snapshot = heavyUndoHistory.pop();
            for (const p of board.Polyominoes) {
                for (const t of p.Tiles) {
                    const saved = snapshot[`${t.x},${t.y}`];
                    t.isHeavy = saved ? saved.isHeavy : DEFAULT_HEAVY;
                    t.weight  = saved ? saved.weight  : DEFAULT_WEIGHT;
                }
            }
            for (const t of board.ConcreteTiles) {
                const saved = snapshot[`${t.x},${t.y}`];
                t.isHeavy = saved ? saved.isHeavy : DEFAULT_HEAVY;
                t.weight  = saved ? saved.weight  : DEFAULT_WEIGHT;
            }
        };
    }

    // ---- Fix 2: Load XML — read <Heavy> and <Weight> elements ----

    if (typeof window.parseXML === 'function') {
        const originalParseXML = window.parseXML;
        window.parseXML = function (xmlText, ...rest) {
            originalParseXML.apply(this, [xmlText, ...rest]);
            if (!board) return;

            try {
                let text = typeof xmlText === 'string' ? xmlText : String(xmlText);
                if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
                const trimmed = text.trim();
                if (!trimmed.startsWith('<')) return;

                const xmlDoc = new DOMParser().parseFromString(trimmed, 'text/xml');
                if (xmlDoc.getElementsByTagName('parsererror').length > 0) return;

                const tileData = xmlDoc.getElementsByTagName('TileData')[0];
                if (!tileData) return;

                for (const tileElem of tileData.getElementsByTagName('Tile')) {
                    const loc = tileElem.getElementsByTagName('Location')[0];
                    if (!loc) continue;
                    const x = parseInt(loc.getAttribute('x'), 10);
                    const y = parseInt(loc.getAttribute('y'), 10);
                    if (Number.isNaN(x) || Number.isNaN(y)) continue;

                    const heavyElem  = tileElem.getElementsByTagName('Heavy')[0];
                    const weightElem = tileElem.getElementsByTagName('Weight')[0];

                    const tile = board.coordToTile[x]?.[y];
                    if (!tile) continue;

                    tile.isHeavy = (heavyElem?.textContent ?? '').trim().toLowerCase() === 'true';
                    tile.weight  = normalizeWeight(weightElem ? parseInt(weightElem.textContent, 10) : DEFAULT_WEIGHT);
                }
            } catch (e) {
                // Fall back to safe defaults if re-parsing fails.
                ensureBoardTileSettings(currentWeight(), DEFAULT_HEAVY);
            }
        };
    }

    // ---- Fix 3: Save XML — write <Heavy> and <Weight> elements ----
    //
    // The save button is bound to the original saveFileHandler by init() inside
    // app.js, which runs before this script's DOMContentLoaded listener. We
    // replace the button node (cloneNode strips old listeners) and attach our
    // own handler that writes the extra fields.

    function heavySaveFileHandler() {
        if (!board) return;

        const esc = typeof window.escapeXml === 'function'
            ? window.escapeXml
            : (v) => String(v)
                .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;').replace(/'/g, '&apos;');

        const toXmlColor = typeof window.colorToXmlText === 'function'
            ? window.colorToXmlText
            : (c) => String(c).replace('#', '').toUpperCase();

        let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<TileConfiguration>\n';
        xml += `  <BoardSize height="${board.Rows}" width="${board.Cols}" />\n  <TileData>\n`;

        const appendTile = (tile, isConcrete) => {
            const glues  = (tile.glues && tile.glues.length === 4) ? tile.glues : [' ', ' ', ' ', ' '];
            const weight = normalizeWeight(tile.weight === undefined ? DEFAULT_WEIGHT : tile.weight);
            const isHeavy = tile.isHeavy === true;

            xml += `    <Tile>\n`;
            xml += `      <Location x="${tile.x}" y="${tile.y}" />\n`;
            xml += `      <Color>${toXmlColor(tile.color)}</Color>\n`;
            xml += `      <NorthGlue>${glues[0] && glues[0] !== ' ' ? esc(glues[0]) : 'None'}</NorthGlue>\n`;
            xml += `      <SouthGlue>${glues[2] && glues[2] !== ' ' ? esc(glues[2]) : 'None'}</SouthGlue>\n`;
            xml += `      <EastGlue>${glues[1] && glues[1] !== ' ' ? esc(glues[1]) : 'None'}</EastGlue>\n`;
            xml += `      <WestGlue>${glues[3] && glues[3] !== ' ' ? esc(glues[3]) : 'None'}</WestGlue>\n`;
            xml += `      <Concrete>${isConcrete ? 'True' : 'False'}</Concrete>\n`;
            xml += `      <Label>${esc(tile.name || '')}</Label>\n`;
            xml += `      <Heavy>${isHeavy ? 'True' : 'False'}</Heavy>\n`;
            xml += `      <Weight>${weight}</Weight>\n`;
            xml += `    </Tile>\n`;
        };

        for (const p of board.Polyominoes) {
            for (const tile of p.Tiles) appendTile(tile, false);
        }
        for (const tile of board.ConcreteTiles) appendTile(tile, true);

        xml += `  </TileData>\n</TileConfiguration>`;

        const blob = new Blob([xml], { type: 'text/xml' });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement('a');
        a.href = url;
        a.download = 'tumbletiles_heavy_config.xml';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
    }

    // ---- Initialization ----

    window.addEventListener('DOMContentLoaded', () => {
        const weightInput = getWeightInput();
        if (weightInput) {
            weightInput.value = String(normalizeWeight(weightInput.value));
            weightInput.addEventListener('change', () => {
                weightInput.value = String(normalizeWeight(weightInput.value));
            });
        }

        const heavyToggle = getHeavyToggle();
        if (heavyToggle) {
            heavyToggle.checked = DEFAULT_HEAVY;
        }

        ensureBoardTileSettings(currentWeight(), DEFAULT_HEAVY);

        const status = document.getElementById('canvas-status');
        if (status && !status.textContent) {
            status.textContent = 'Heavy tile mode: heavy tiles move by weight; normal tiles move until blocked.';
        }

        // Replace the save button so the heavy-aware handler fires instead of
        // the original saveFileHandler that was bound by init().
        const saveBtn = document.getElementById('save-file');
        if (saveBtn) {
            const newBtn = saveBtn.cloneNode(true); // cloneNode strips event listeners
            saveBtn.parentNode.replaceChild(newBtn, saveBtn);
            newBtn.addEventListener('click', heavySaveFileHandler);
        }
    });
})();
