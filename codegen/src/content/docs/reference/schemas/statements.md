---
title: Statement Nodes
---

## `BlockNode` _(extends `StatementNode`)_

_kind discriminant: `"Block"`_

| Field | Type |
|---|---|
| `statements` | `Node[]` |

---


## `IfNode` _(extends `StatementNode`)_

_kind discriminant: `"IfStatement"`_

| Field | Type |
|---|---|
| `isConstexpr` | `boolean` |
| `initStatement` | `Node?` |
| `condition` | `Node?` |
| `thenBody` | `BlockNode?` |
| `elseBody` | `Node?` |

---


## `SwitchNode` _(extends `StatementNode`)_

_kind discriminant: `"SwitchStatement"`_

| Field | Type |
|---|---|
| `initStatement` | `Node?` |
| `condition` | `Node?` |
| `cases` | `Node[]` |

---


## `CaseLabelNode` _(extends `StatementNode`)_

_kind discriminant: `"CaseLabel"`_

| Field | Type |
|---|---|
| `value` | `Node?` |
| `statements` | `Node[]` |

---


## `BreakNode` _(extends `StatementNode`)_

_kind discriminant: `"BreakStatement"`_

_No own serialized fields._

---


## `ContinueNode` _(extends `StatementNode`)_

_kind discriminant: `"ContinueStatement"`_

_No own serialized fields._

---


## `ReturnNode` _(extends `StatementNode`)_

_kind discriminant: `"ReturnStatement"`_

| Field | Type |
|---|---|
| `value` | `Node?` |

---


## `GotoNode` _(extends `StatementNode`)_

_kind discriminant: `"GotoStatement"`_

| Field | Type |
|---|---|
| `label` | `string` |

---


## `LabeledStatementNode` _(extends `StatementNode`)_

_kind discriminant: `"LabeledStatement"`_

| Field | Type |
|---|---|
| `label` | `string` |
| `body` | `Node?` |

---


## `DefaultLabelNode` _(extends `StatementNode`)_

_kind discriminant: `"DefaultLabel"`_

| Field | Type |
|---|---|
| `statements` | `Node[]` |

---


## `WhileNode` _(extends `StatementNode`)_

_kind discriminant: `"WhileStatement"`_

| Field | Type |
|---|---|
| `initStatement` | `Node?` |
| `condition` | `Node?` |
| `body` | `BlockNode?` |

---


## `DoWhileNode` _(extends `StatementNode`)_

_kind discriminant: `"DoWhileStatement"`_

| Field | Type |
|---|---|
| `condition` | `Node?` |
| `body` | `BlockNode?` |

---


## `ForNode` _(extends `StatementNode`)_

_kind discriminant: `"ForStatement"`_

| Field | Type |
|---|---|
| `init` | `Node?` |
| `condition` | `Node?` |
| `update` | `Node?` |
| `body` | `BlockNode?` |

---


## `ForRangeNode` _(extends `StatementNode`)_

_kind discriminant: `"ForRangeStatement"`_

| Field | Type |
|---|---|
| `initStatement` | `Node?` |
| `loopVar` | `Node?` |
| `range` | `Node?` |
| `body` | `BlockNode?` |

---


## `CatchClauseNode` _(extends `StatementNode`)_

_kind discriminant: `"CatchClause"`_

| Field | Type |
|---|---|
| `isCatchAll` | `boolean` |
| `parameter` | `Node?` |
| `body` | `BlockNode?` |

---


## `TryNode` _(extends `StatementNode`)_

_kind discriminant: `"TryStatement"`_

| Field | Type |
|---|---|
| `body` | `BlockNode?` |
| `catchClauses` | `CatchClauseNode[]` |

---
