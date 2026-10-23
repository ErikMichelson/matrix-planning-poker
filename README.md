# Matrix Planning Poker Widget

This is a widget for matrix clients like [Element](https://element.io/app) that allows participants
of a room to vote for Fibonacci weights, for example in the use case of evaluating weights in a
sprint planning workflow.

This project is a hard-fork of [`weeman/matrix-planning-poker`](https://codeberg.org/weeman/matrix-planning-poker/)
with the following enhancements:

- up-to-date toolchains and dependencies
- use of proper display names for participants
- strict validation of events (so people can't inject invalid values using manually crafted events)
- custom labels for rounds to indicate to everyone what is voted about

## Installation

This widget is built and hosted on GitHub pages, so you can go to the deployment and copy the
installation directly command from there: <https://erikmichelson.github.io/matrix-planning-poker/>

## Development

This project uses the `pnpm` package manager and Node.js 24.

- Build the code using `pnpm run build`
- Run checks (formatting, linting, code quality) using `pnpm run check`
- Run a hot-reloading dev server using `pnpm run dev`
- Fix formatting issues using `pnpm run fix`

Conventional commits are used, there are git hooks and CI to ensure the commit messages match the
format.

## Technical details and event formats

The widget uses a room state event of type `weeman.planning_poker_round` to indicate the current
phase of the round. Since this is a state event, by default only room moderators with a power
level of 50 or higher can manage rounds.

When editing a round, the state event ID changes and therefore all votes would be lost.
In order to keep the votes, the edited state includes a `round_id` field, referencing the original
round event. This is later user to aggregate votes together.

```jsonc
{
  "type": "weeman.planning_poker_round",
  "content": {
    // bool whether the current round is open to poker or closed to show cards
    "active": true,
    // custom label for the current round
    "label": "https://example.com/issue-123",
    // Round ID to keep votes on edited rounds
    "round_id": "$123456789"
  }
}
```

Room participants automatically send a message event of type `weeman.planning_poker_card` in
reference to the latest planning poker round room state when they select a card.

```jsonc
{
    "type": "weeman.planning_poker_card",
    "content": {
        // selected poker card
        "value": "2",
        "m.relates_to": {
            "rel_type": "m.reference",
            // the current round's state event
            "event_id": "$123456789"
        }
    }
}
```

## License

Licensed under MIT license.
