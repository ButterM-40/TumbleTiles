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
        if (!window.board) return;
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

    if (typeof window.parseXML === 'function') {
        const originalParseXML = window.parseXML;
        window.parseXML = function (...args) {
            originalParseXML.apply(this, args);
            ensureBoardTileSettings(currentWeight(), DEFAULT_HEAVY);
        };
    }

    if (typeof window.undoAction === 'function') {
        const originalUndoAction = window.undoAction;
        window.undoAction = function (...args) {
            originalUndoAction.apply(this, args);
            ensureBoardTileSettings(currentWeight(), DEFAULT_HEAVY);
        };
    }

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
            status.textContent = 'Heavy toggle enabled: heavy tiles move by weight; normal tiles move until blocked.';
        }
    });
})();
