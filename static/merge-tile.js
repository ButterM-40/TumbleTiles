(function () {
    // Adds same-type tile merging to TumbleTiles.
    // After every ActivateGlues call (which includes every Tumble), adjacent
    // non-concrete tiles that share the same non-empty name are collapsed into
    // one tile. The consumed tile is removed; if its removal disconnects a
    // multi-tile polyomino, the pieces are split into separate polyominoes.

    Board.prototype._removeTile = function (tile) {
        if (!tile || tile.isConcrete) return;

        if (this.coordToTile[tile.x] && this.coordToTile[tile.x][tile.y] === tile) {
            this.coordToTile[tile.x][tile.y] = null;
        }

        const parent = tile.parent;
        if (!parent) return;

        const idx = parent.Tiles.indexOf(tile);
        if (idx > -1) parent.Tiles.splice(idx, 1);

        if (parent.Tiles.length === 0) {
            const pi = this.Polyominoes.indexOf(parent);
            if (pi > -1) this.Polyominoes.splice(pi, 1);
        } else {
            this._splitDisconnected(parent);
        }
    };

    Board.prototype._splitDisconnected = function (poly) {
        if (poly.Tiles.length <= 1) return;

        const unvisited = new Set(poly.Tiles);
        const components = [];

        while (unvisited.size > 0) {
            const start = unvisited.values().next().value;
            const component = [];
            const queue = [start];
            unvisited.delete(start);

            while (queue.length > 0) {
                const cur = queue.shift();
                component.push(cur);
                for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                    const nx = cur.x + dx, ny = cur.y + dy;
                    if (nx < 0 || nx >= this.Cols || ny < 0 || ny >= this.Rows) continue;
                    const nb = this.coordToTile[nx][ny];
                    if (nb && nb.parent === poly && unvisited.has(nb)) {
                        unvisited.delete(nb);
                        queue.push(nb);
                    }
                }
            }
            components.push(component);
        }

        if (components.length <= 1) return;

        poly.Tiles = components[0];
        for (const t of components[0]) { t.parent = poly; t.symbol = poly.id; }

        for (let i = 1; i < components.length; i++) {
            const newPoly = new Polyomino(this.poly_id_c++);
            newPoly.Tiles = components[i];
            for (const t of components[i]) { t.parent = newPoly; t.symbol = newPoly.id; }
            this.Polyominoes.push(newPoly);
        }
    };

    Board.prototype.MergeSameTiles = function () {
        let changed = true;
        while (changed) {
            changed = false;
            outer:
            for (const p of [...this.Polyominoes]) {
                for (const tile of [...p.Tiles]) {
                    if (!tile.name || tile.name.trim() === '') continue;
                    for (const [dx, dy] of [[1,0],[-1,0],[0,1],[0,-1]]) {
                        const nx = tile.x + dx, ny = tile.y + dy;
                        if (nx < 0 || nx >= this.Cols || ny < 0 || ny >= this.Rows) continue;
                        const nb = this.coordToTile[nx]?.[ny];
                        if (nb && !nb.isConcrete && nb !== tile && nb.name === tile.name) {
                            this._removeTile(nb);
                            changed = true;
                            break outer;
                        }
                    }
                }
            }
        }
    };

    // Hook into ActivateGlues so merging fires automatically on every tumble
    // and on the manual "Activate Glues" button press.
    const originalActivateGlues = Board.prototype.ActivateGlues;
    Board.prototype.ActivateGlues = function () {
        originalActivateGlues.call(this);
        this.MergeSameTiles();
    };

    window.addEventListener('DOMContentLoaded', () => {
        const status = document.getElementById('canvas-status');
        if (status && !status.textContent) {
            status.textContent = 'Merge tile mode: adjacent tiles with the same name collapse into one after each move.';
        }
    });
})();
