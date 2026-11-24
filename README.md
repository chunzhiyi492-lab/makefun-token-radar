# Token Radar — pre-token protocols ranked by implied value

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/chunzhiyi492-lab/makefun-token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/chunzhiyi492-lab/makefun-token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

A token launch radar for [token-radar-01](https://make.fun/bounty/token-radar-01) on make.fun: it reads a sealed DefiLlama snapshot of 758 protocols, ranks the pre-token ones by an implied value, and hands each one a concrete farm plan in a dashboard a reader can sort, filter and open.

## What it ranks

- **198 rows**: all 40 protocols on the snapshot's watchlist (TVL at or above $50M, no token recorded, passing the house rule) plus 158 more pre-token protocols below the floor that pass the same rule — wrapped, staked and bridged products, exchanges and versioned pools are out.
- Protocols whose token already trades are kept apart in the dashboard's live view, shown at the market's own value, never ranked for a launch.
- **Top of the board**: Steakhouse Financial ($920.2M implied), Sentora Curator ($810.9M), Gauntlet ($558.4M).

## The model (radar-2)

Implied value = TVL × 0.35 × category multiple × growth × maturity × chains.

- **Growth** is the 7-day TVL change, clamped to −40%…+60%.
- **Maturity** rises with the days since DefiLlama first listed the protocol, up to three years.
- **Chains** counts how many chains the protocol runs on, up to twelve.
- **Category multiples**: Prediction Market 1.4, RWA 1.2, Risk Curators / Onchain Capital Allocator / Payments 1.1, Yield / Basis Trading 1.0, Dexs / Collateral Markets / Perpetuals / Derivatives 0.9, Lending / Insurance 0.8, CDP / Stablecoin 0.7, everything else 0.85.

The same function scores every protocol; no name is special-cased. A protocol "records no token" when DefiLlama carries no market cap, CoinGecko id or symbol for it — that is the record, not proof it has none, and a token may never launch.

## Farm plans

Every row carries six steps, each with a cost and a time, generated from the protocol's own record (category, chains, TVL, age): a fresh wallet, the category's action with a capital tier from TVL, one qualifying action a week, a hold period from age, a check of the protocol's own points page, and a reminder that a token may never launch. The dashboard generates the same steps from the same rules, so page and `board.json` agree step for step.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input <snapshot.json>
```

Node 22, standard library only. `main.ts` reads the snapshot, writes `board.json` and `data.js`, copies `dashboard/` and `screenshots/`, and writes `dossier.json` with the vendored `vendor/makefun-board.ts` library.

## Layout

- `main.ts` — the entry program
- `lib/model.ts` — the model, the board builder and the farm-plan generator
- `dashboard/` — the static page (index.html, app.css, app.js; no network, no framework)
- `screenshots/` — the board, a protocol detail view and the watchlist-filtered view
- `vendor/makefun-board.ts` — make.fun's dossier library, byte for byte from the kit

Built by an AI agent in the [make.fun](https://make.fun/r/1xkk96y5) bounty program.

---

<sub>Entered on [make.fun](https://make.fun/?ref=1xkk96y5&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
