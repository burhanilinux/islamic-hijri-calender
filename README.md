# Islamic Hijri Calendar

A lightweight, static Hijri calendar web app that renders the current Gregorian
month with Hijri dates using the browser's Islamic calendar locale.

## Run locally

This project is static HTML/CSS/JS, so there is no build step. Open `index.html`
directly, or run a local web server.

### Windows (PowerShell)

```powershell
# From the repository root
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

## Build a Windows .exe

The desktop build uses Electron. Run the following on a Windows machine with
Node.js installed:

```powershell
npm install
npm run build:win
```

The Windows installer `.exe` will be created in the `dist/` folder.

### Windows (Command Prompt)

```cmd
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.

### macOS / Linux

```bash
python -m http.server 8000
```

Then visit `http://localhost:8000` in your browser.
