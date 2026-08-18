---
title: Preprocessor Nodes
---

## `FunctionLikeMacroNode` _(extends `PreprocessorNode`)_

_kind discriminant: `"FunctionLikeMacro"`_

| Field | Type |
|---|---|
| `name` | `string` |
| `body` | `string` |
| `parameters` | `MacroParameter[]` |

---


## `IncludeNode` _(extends `PreprocessorNode`)_

_kind discriminant: `"IncludeDirective"`_

| Field | Type |
|---|---|
| `path` | `string` |
| `isSystem` | `boolean` |

---


## `ObjectLikeMacroNode` _(extends `PreprocessorNode`)_

_kind discriminant: `"ObjectLikeMacro"`_

| Field | Type |
|---|---|
| `name` | `string` |
| `body` | `string` |

---


## `PragmaNode` _(extends `PreprocessorNode`)_

_kind discriminant: `"Pragma"`_

| Field | Type |
|---|---|
| `pragmaKind` | `string` |
| `rawArg` | `string` |
| `packAction` | `string` |
| `packAlignment` | `number` |
| `packLabel` | `string` |
| `warningAction` | `string` |
| `warningCodes` | `number[]` |
| `messageText` | `string` |
| `regionName` | `string` |
| `stdcSetting` | `string` |
| `stdcValue` | `string` |
| `commentType` | `string` |
| `commentValue` | `string` |

---
