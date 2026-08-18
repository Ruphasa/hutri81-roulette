# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Bun for dependency management and scripts, Astro with static output, and vanilla TypeScript for the interactive raffle state machine. The application is packaged as a PWA and deployed to Vercel from GitHub without server functions.

## Users

The primary operator is a member of the Griya Shanta RT 08 event committee running the raffle from a laptop connected to a projector. Residents attending the HUT RI ke-81 evening event are the viewing audience.

## Product Purpose

Run a festive, transparent raffle for approximately 165 property-lot numbers. Success means the audience can follow the draw from a projector, the operator can run 4–5 prize rounds confidently, and no lot number can win more than once.

## Positioning

An offline-first neighborhood raffle that combines a theatrical roulette presentation with deterministic winner tracking and automatic generation of valid lot-number ranges.

## Operating Context

- Used at a crowded evening community event from a projector-connected laptop.
- Internet access and mobile-network reliability cannot be assumed.
- Lot-number ranges such as `L201–L250` and `K301–K450` will be supplied and expanded automatically.
- The raffle has approximately 165 participants and 4–5 prizes.

## Capabilities and Constraints

- Operates completely offline after installation.
- Generates participant lot numbers from configured ranges.
- Selects one valid active lot number per prize round.
- Removes each winner from subsequent rounds.
- Presents the draw as a roulette with the current or winning lot number displayed in its center.
- Exact lot-number ranges and final prize count remain open decisions.

## Brand Commitments

- Event identity: Malam HUT RI ke-81, Griya Shanta RT 08.
- The visual direction combines Art Deco/Vegas casino structure with punk-subculture collage, ransom-note typography, and deliberately skewed or oblique composition.
- The result must feel authored and theatrical, not like generic AI-generated dashboard styling.
- Persona 5's Sae Niijima casino palace is a reference for energy and graphic grammar; original assets and event-specific composition will be used.

## Evidence on Hand

- Confirmed requirements and prior decisions are recorded in the approved design specification under `docs/superpowers/specs/`.
- No final logo, prize artwork, complete lot-number list, or production code exists yet.

## Product Principles

- Keep the winner legible from across the event space.
- Make one random result the source of truth for every visual state.
- Preserve operator confidence under offline, live-event conditions.
- Favor deliberate theatrical motion over decorative animation.
- Keep the raffle fair by preventing repeat winners.

## Accessibility & Inclusion

Critical numbers and statuses must use projector-safe size and contrast. Information must not rely on color alone, and the final application should provide a reduced-motion mode.
