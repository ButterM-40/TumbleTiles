# TumbleTiles Static Web Version

This is a **static, client-side** implementation of TumbleTiles that runs entirely in your browser. No server or Python installation required!

## Features

✅ **100% Static** - Host on GitHub Pages, Netlify, or any static hosting
✅ **No Dependencies** - Pure HTML, CSS, and JavaScript
✅ **Offline Capable** - Works without internet after initial load
✅ **Full Simulation** - Complete port of the Python tumbletiles.py logic
✅ **Interactive UI** - Click-to-add tiles, visual board editor
✅ **Script Execution** - Run NESW sequences with delays and looping
✅ **File I/O** - Load and save XML configurations
✅ **Responsive** - Works on desktop and tablet devices

## Quick Start

### Local Development
Simply open `index.html` in your web browser. That's it!

```bash
# Navigate to the static folder
cd static

# Open with your default browser (or double-click index.html)
start index.html    # Windows
open index.html     # macOS
xdg-open index.html # Linux
```

### Deploy to GitHub Pages

1. Create a new repository or use existing one
2. Push the `static` folder contents to the repository
3. Go to Settings → Pages
4. Select branch (usually `main`) and root folder
5. Your site will be live at `https://yourusername.github.io/repository-name`

### Deploy to Netlify

1. Drag and drop the `static` folder to [Netlify Drop](https://app.netlify.com/drop)
2. Or connect your GitHub repository for automatic deployments

### Deploy to Vercel

```bash
cd static
npx vercel --prod
```

## Usage Guide

### Adding Tiles
1. **Manual Entry**: Enter X, Y coordinates, choose color and glues, click "Add Tile"
2. **Click-to-Add**: Enable click mode and click directly on the canvas

### Movement
- Use directional buttons to tumble tiles in any direction (N, E, S, W)
- Tiles follow gravity and collision physics
- Click "Activate Glues" to manually bond adjacent tiles with matching glues

### Script Execution
1. Enter a sequence of moves: `NESW` (e.g., `NNESSW`)
2. Set delay between moves (milliseconds)
3. Enable "Loop Sequence" for continuous execution
4. Click "Run Script" to start, "Stop Script" to halt

### File Operations
- **Load XML**: Click "Choose File" → Select XML → Click "Load XML"
- **Save XML**: Click "Save XML" to download current configuration
- Toggle "Activate glues on load" to auto-bond tiles when loading

### Board Settings
- Resize board dimensions (5-50 cells)
- Clear all tiles
- Existing tiles are preserved when resizing (if they fit)

## File Structure

```
static/
├── index.html          # Main HTML structure
├── style.css           # UI styling
├── tumbletiles.js      # Core simulation logic (Tile, Polyomino, Board)
└── app.js              # UI handlers and canvas rendering
```

## XML Configuration Format

```xml
<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <board width="15" height="15"/>
  <tiles>
    <tile x="7" y="7" color="#3498db" name="MyTile">
      <glue direction="N" label="A"/>
      <glue direction="E" label="B"/>
      <glue direction="S" label="A"/>
      <glue direction="W" label="B"/>
    </tile>
    <tile x="5" y="5" color="#686868" concrete="true"/>
  </tiles>
</configuration>
```

## Browser Compatibility

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+
- Opera 76+

## Advantages Over Python/Streamlit Version

| Feature | Static JavaScript | Streamlit |
|---------|------------------|-----------|
| **Hosting Cost** | Free (GitHub Pages) | Requires server |
| **Setup** | Open HTML file | Python + dependencies |
| **Performance** | Instant, client-side | Network latency |
| **Offline** | ✅ Yes | ❌ No |
| **Scalability** | Unlimited users | Server resources |
| **Mobile** | Touch-friendly | Limited |

## Development

No build process needed! Edit the files and refresh your browser.

### Key Components

**tumbletiles.js** - Core classes:
- `Tile`: Individual tile with position, color, glues
- `Polyomino`: Collection of bonded tiles
- `Board`: Grid management, collision detection, tumbling physics

**app.js** - UI logic:
- Canvas rendering with HTML5 Canvas API
- Event handlers for buttons and clicks
- XML parsing and generation
- Script execution engine

**style.css** - Modern gradient UI with responsive grid layout

## Limitations

- Canvas size limited by browser memory (50×50 max recommended)
- No server-side computation for very large assemblies
- No GIF/animation export (could be added with external library)

## Future Enhancements

- Export board as PNG image
- Preset configurations gallery
- Touch gestures for mobile
- Multiple board comparison view
- Animation timeline scrubbing

## Credits

Original TumbleTiles simulation by Tim Wylie (2018)
JavaScript port for static hosting (2026)

## License

Same as original TumbleTiles project
