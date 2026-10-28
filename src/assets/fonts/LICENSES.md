# Font licenses

Every font here is a self-hosted, latin-subset `woff2` file, released under the
**SIL Open Font License 1.1** (https://openfontlicense.org). The OFL allows use,
embedding and redistribution, including in commercial work, as long as the
license travels with the fonts.

| File | Family | Role | Upstream |
| --- | --- | --- | --- |
| `instrument-serif-latin-400-normal.woff2` | Instrument Serif Regular | Display | https://github.com/Instrument/instrument-serif |
| `instrument-serif-latin-400-italic.woff2` | Instrument Serif Italic | Display emphasis | https://github.com/Instrument/instrument-serif |
| `inter-latin-variable.woff2` | Inter (variable, wght 100–900) | UI and body | https://github.com/rsms/inter |
| `jetbrains-mono-latin-variable.woff2` | JetBrains Mono (variable, wght 100–800) | Labels and data | https://github.com/JetBrains/JetBrainsMono |

See each upstream repository for the full license text and copyright statements.

The files were fetched from `fonts.gstatic.com` (the paths that Google Fonts'
`css2` endpoint returns for the `latin` subset) on 2026-10-28. To support more
scripts, add the matching subsets (`latin-ext`, `vietnamese`, …) to
`src/styles/fonts.css`; Instrument Serif has no Vietnamese subset, so those
glyphs fall back to the serif system stack.
