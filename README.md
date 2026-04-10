# Vybz

Vybz is a Tauri desktop app for managing multiple project terminal sessions. Each project gets a color-coded sidebar entry and tabbed terminals that can run shells or AI coding tools.

## Screenshots

![Vybz main view](docs/assets/screenshot_01.jpg)
![Tool tab](docs/assets/screenshot_02.jpg)

![Theme picker](docs/assets/screenshot_03.jpg)
![Project settings](docs/assets/screenshot_04.jpg)

![Settings view](docs/assets/screenshot_05.jpg)
![Settings view](docs/assets/screenshot_06.jpg)
---
## Stack

- Tauri v2
- React 19
- TypeScript
- Rust

## Development

```bash
pnpm install
pnpm tauri dev
```

Frontend only:

```bash
pnpm dev
```

Production build:

```bash
pnpm build
pnpm tauri build
```

## Notes

- Frontend state lives in `src/`
- Tauri backend lives in `src-tauri/`
- Theme system reference: `docs/refs/theme-module.md`
