# Infooo World 002 — Rubik’s Cube Motion Graph

**Status:** Ready for Khizar review. It remains `noindex` and excluded from the public sitemap until an explicit public-release approval.

## Scope

This world teaches how legal face turns permute a real 3×3×3 cube state. The local engine owns cubie identity, position, sticker orientation, visible facelets, sequences, inverse sequences, and deterministic scrambles. Shared Infooo code only owns the shell, stage, accessibility primitives, and honest-source disclosure.

## Truth boundaries

- **Fact:** eight corners, twelve edges, six fixed centers, and 54 visible stickers; a face turn permutes cubies and changes sticker orientation.
- **Model:** the default Motion Graph places the 20 movable physical cubies on two quiet orbits: eight corners and twelve edges. A token keeps its colors and identity as it moves between position slots. The optional advanced Sticker View lays out the same state as 54 facelets. Neither visual is physical internal cube geometry.
- **Simulation:** the one-turn and full-trace playback apply deterministic local face turns. The full trace reverses its short sequence; it is never presented as an optimal or human solving method.

## First experience

The compact hero leads directly into one shared canvas with a three-face cube and matching colored-piece graph. Watch it move highlights one corner, applies one right-face turn, and explains its old and new positions. Face controls and the longer seven-turn trace appear after this first lesson. Mobile shows one synchronized view at a time; reduced-motion visitors receive the same before/after state and text insight without animation.

## Public-release gate

Before changing `world-002` to `published` / `public`, remove its explicit sitemap exclusion and `noindex` only after Khizar approves the review build. Add its Compound Value pack at the same time so the public manifest remains canonical.
