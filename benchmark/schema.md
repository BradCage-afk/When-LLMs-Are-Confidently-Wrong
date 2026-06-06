# Benchmark Question Schema

Both `fide_questions.json` and `fia_questions.json` are JSON arrays of question
objects. Every object conforms to the following schema.

```json
{
  "id": "fide_001",
  "domain": "fide",
  "tier": 1,
  "subtopic": "basic_moves",
  "question": "A clear, self-contained question with a single defensible answer.",
  "correct_answer": "The authoritative answer.",
  "explanation": "Why the answer is correct, with reasoning.",
  "source": "FIDE Laws of Chess 2023, Article 3.7",
  "common_misconception": "The intuitive-but-wrong belief this question targets."
}
```

## Field definitions

| Field                  | Type           | Notes |
|------------------------|----------------|-------|
| `id`                   | string         | `fide_NNN` or `fia_NNN`, zero-padded to 3 digits, unique. |
| `domain`               | string         | `"fide"` or `"fia"`. |
| `tier`                 | integer        | `1` (factual), `2` (edge case), `3` (trap). |
| `subtopic`             | string         | Canonical slug — see taxonomy below. |
| `question`             | string         | Unambiguous, single defensible answer. |
| `correct_answer`       | string         | Concise ground truth used by the LLM judge. |
| `explanation`          | string         | Extended justification shown in the dataset explorer. |
| `source`               | string         | Specific regulation + article number. |
| `common_misconception` | string         | Present for **every** question. |

## Tier distribution (per domain)

- **Tier 1** — 40 questions — straightforward factual.
- **Tier 2** — 40 questions — edge cases / procedure.
- **Tier 3** — 20 questions — traps where the intuitive answer is wrong.

Total: 100 per domain, 200 overall.

## Canonical subtopic taxonomy

These slugs are shared by the benchmark, the metrics pipeline, and the mock data
generator. Do not invent new slugs outside this list.

### FIDE
`basic_moves`, `check_checkmate`, `stalemate_draws`, `piece_values`,
`tournament_basics`, `en_passant`, `castling_rules`, `touch_move`,
`clock_handling`, `scoresheet_obligations`, `threefold_repetition`,
`fifty_move_rule`, `insufficient_material`, `illegal_position_procedure`,
`arbiter_edge_cases`.

### FIA
`qualifying_format`, `pit_lane_rules`, `race_start`, `safety_car`, `vsc`,
`drs`, `blue_flags`, `points_scoring`, `parc_ferme`, `technical_regulations`,
`cost_cap_rules`, `power_unit_penalties`, `sprint_weekend_procedure`,
`red_flag_restart`, `driver_change`, `weight_enforcement`, `steward_decisions`,
`track_limits`.

## Sources

- FIDE Laws of Chess (effective 1 January 2023) and FIDE Arbiters' Manual.
- 2024 FIA Formula 1 Sporting Regulations and 2024 FIA Formula 1 Technical
  Regulations.
