# Data Directory

This directory is used to store user-uploaded JSON files for visualization.

## Supported File Types

- Flat JSON files with arrays of objects
- JSON files containing nested array properties
- Simple object collections that can be converted to array format

The dashboard's intelligent parsing system will attempt to extract visualization-compatible data structures from a variety of JSON formats.

## Examples

Examples of compatible data structures:

1. Direct array of objects:
```json
[
  {"name": "Item 1", "value": 100, "related": ["A", "B"]},
  {"name": "Item 2", "value": 200, "related": ["B", "C"]}
]
```

2. Object with array property:
```json
{
  "items": [
    {"name": "Item 1", "value": 100, "related": ["A", "B"]},
    {"name": "Item 2", "value": 200, "related": ["B", "C"]}
  ]
}
```

3. Object collection:
```json
{
  "item1": {"name": "Item 1", "value": 100, "related": ["A", "B"]},
  "item2": {"name": "Item 2", "value": 200, "related": ["B", "C"]}
}
```
