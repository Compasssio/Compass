# Compass Pokémon engine

A separately licensed helper program that Compass uses for its Pokémon features. It is built from
pinned upstream source revisions and released under GPL-3.0-or-later (see `LICENSE`).

## Source

The exact upstream revisions are pinned in `upstream.json`:

- PKForge
- PKForge-PKHeX
- PKHeX-Plugins

## Building

```
node tools/pokemon-engine/build.mjs --fetch-source <source dir> --output <engine dir>
```

Requires Git, Node.js and the .NET SDK. Add `--rid win-x64|linux-x64|linux-arm64|osx-x64|osx-arm64`
to build for a platform other than the one you run on.

## Corresponding source

The build writes a `sources/` folder next to the engine. It holds a zip of each upstream revision
listed in `upstream.json`, plus `Program.cs`, `Compass.PokemonEngine.csproj`, `upstream.json`,
`LICENSE`, `build.mjs` and this file.
