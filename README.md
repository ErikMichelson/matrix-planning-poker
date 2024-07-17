# Matrix Planning Poker Widget

## Event spec

```
{
  "type": "weeman.planning_poker_round",
  "content": {
    "active": <bool whether the current round is open to poker or closed to show cards>
  }
}
```

```
{
    "type": "weeman.planning_poker_card",
    "content": {
        "value": "<selected poker card>",
        "m.relates_to": {
            "rel_type": "m.reference",
            "event_id": "<the current round's state event>"
        }
    }
}
```
