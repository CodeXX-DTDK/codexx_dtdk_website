---
title: Core Nodes
---

## `TemplateArgument`

| Field | Type |
|---|---|
| `keyword` | `string` |
| `typeSignature` | `TypeSignature?` |
| `expr` | `Node?` |
| `value` | `string` |

---


## `TemplateParameter`

| Field | Type |
|---|---|
| `paramKind` | `TemplateParameterKind` |
| `name` | `string` |
| `isVariadic` | `boolean` |
| `defaultValue` | `Node?` |
| `keyword` | `string` |
| `constraint` | `IdentifierNode?` |
| `typeSignature` | `TypeSignature` |
| `innerParameters` | `TemplateParameter[]` |

---


## `FunctionArgument`

| Field | Type |
|---|---|
| `expr` | `Node?` |
| `isPackExpansion` | `boolean` |

---


## `FunctionParameter`

| Field | Type |
|---|---|
| `typeSignature` | `TypeSignature` |
| `name` | `string` |
| `defaultValue` | `Node?` |

---


## `IdentifierNode` _(extends `Node`)_

_kind discriminant: `"Identifier"`_

| Field | Type |
|---|---|
| `qualification` | `IdentifierNode?` |
| `name` | `string` |
| `templateArgs` | `TemplateArgument[]` |

---


## `TypeDeclarator`

| Field | Type |
|---|---|
| `kind` | `DeclaratorKind` |
| `isConst` | `boolean` |
| `isVolatile` | `boolean` |
| `arraySizeExpr` | `Node?` |

---


## `PlaceholderTypeSpecifier`

| Field | Type |
|---|---|
| `kind` | `Auto` |
| `constraint` | `TypeSignature?` |

---


## `FunctionPointerSignature`

| Field | Type |
|---|---|
| `scopeName` | `string` |
| `parameterTypes` | `TypeSignature[]` |
| `returnFunctionPointer` | `FunctionPointerSignature?` |
| `isConst` | `boolean` |

---


## `TypeSignature`

| Field | Type |
|---|---|
| `identifier` | `IdentifierNode?` |
| `isConst` | `boolean` |
| `isVolatile` | `boolean` |
| `isMutable` | `boolean` |
| `declarators` | `TypeDeclarator[]` |
| `functionPointer` | `FunctionPointerSignature?` |
| `decltypeSpecifier` | `DecltypeExpressionNode?` |
| `placeholderSpecifier` | `PlaceholderTypeSpecifier?` |

---


## `SourceNode` _(extends `Node`)_

_kind discriminant: `"Source"`_

| Field | Type |
|---|---|
| `source` | `Source?` |
| `children` | `Node[]` |

---


## `LambdaCaptureItem`

| Field | Type |
|---|---|
| `kind` | `LambdaCaptureKind` |
| `identifier` | `IdentifierNode?` |
| `init` | `Node?` |

---


## `MacroParameter`

| Field | Type |
|---|---|
| `name` | `string` |
| `isVariadic` | `boolean` |

---


## `FunctionQualifiers`

| Field | Type |
|---|---|
| `isConst` | `boolean` |
| `isVolatile` | `boolean` |
| `isVirtual` | `boolean` |
| `isPureVirtual` | `boolean` |
| `isOverride` | `boolean` |
| `isFinal` | `boolean` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `isConstexpr` | `boolean` |
| `isConsteval` | `boolean` |
| `isExplicit` | `boolean` |
| `explicitCondition` | `Node?` |
| `isInline` | `boolean` |
| `isStatic` | `boolean` |
| `isDefaulted` | `boolean` |
| `isDeleted` | `boolean` |
| `refQualifier` | `None` |
| `requiresClause` | `Node?` |

---


## `CommentNode` _(extends `Node`)_

_kind discriminant: `"Comment"`_

| Field | Type |
|---|---|
| `text` | `string` |

---


## `NamespaceSegment`

| Field | Type |
|---|---|
| `name` | `string` |
| `isInline` | `boolean` |

---


## `Source`

| Field | Type |
|---|---|
| `name` | `string` |
| `path` | `string` |
| `content` | `string` |
| `encoding` | `string` |
| `lastModifiedTime` | `number` |
| `rawContent` | `string?` |
| `sourceMap` | `SourceMap?` |
| `macroTable` | `MacroTable?` |
| `pendingIncludeEdges` | `string[]` |
| `unsavedBuffer` | `string?` |

---


## `Attribute`

| Field | Type |
|---|---|
| `ns` | `string` |
| `name` | `string` |
| `args` | `string[]` |

---


## `Node`

| Field | Type |
|---|---|
| `kind` | `NodeKind` |
| `startLine` | `number` |
| `startColumn` | `number` |
| `endLine` | `number` |
| `endColumn` | `number` |
| `comment` | `Node?` |

---
