---
title: Core Nodes
---

## `Attribute`

| Field | Type |
|---|---|
| `ns` | `string` |
| `name` | `string` |
| `args` | `string[]` |

---


## `CommentNode` _(extends `Node`)_

_kind discriminant: `"Comment"`_

| Field | Type |
|---|---|
| `text` | `string` |

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


## `FunctionPointerSignature`

| Field | Type |
|---|---|
| `scopeName` | `string` |
| `parameterTypes` | `TypeSignature[]` |
| `returnFunctionPointer` | `FunctionPointerSignature?` |
| `isConst` | `boolean` |

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
| `refQualifier` | `string` |
| `requiresClause` | `Node?` |

---


## `IdentifierNode` _(extends `Node`)_

_kind discriminant: `"Identifier"`_

| Field | Type |
|---|---|
| `qualification` | `IdentifierNode?` |
| `name` | `string` |
| `templateArgs` | `TemplateArgument[]` |

---


## `LambdaCaptureItem`

| Field | Type |
|---|---|
| `kind` | `string` |
| `identifier` | `IdentifierNode?` |
| `init` | `Node?` |

---


## `MacroParameter`

| Field | Type |
|---|---|
| `name` | `string` |
| `isVariadic` | `boolean` |

---


## `MemberInitializer`

| Field | Type |
|---|---|
| `member` | `IdentifierNode?` |
| `args` | `Node[]` |

---


## `NamespaceSegment`

| Field | Type |
|---|---|
| `name` | `string` |
| `isInline` | `boolean` |

---


## `Node`

| Field | Type |
|---|---|
| `kind` | `string` |
| `startLine` | `number` |
| `startColumn` | `number` |
| `endLine` | `number` |
| `endColumn` | `number` |
| `comment` | `Node?` |

---


## `PlaceholderTypeSpecifier`

| Field | Type |
|---|---|
| `kind` | `string` |
| `constraint` | `TypeSignature?` |

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
| `sourceMap` | `null` |
| `macroTable` | `null` |
| `unsavedBuffer` | `string?` |

---


## `SourceNode` _(extends `Node`)_

_kind discriminant: `"Source"`_

| Field | Type |
|---|---|
| `source` | `Source?` |
| `children` | `Node[]` |

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
| `paramKind` | `string` |
| `name` | `string` |
| `isVariadic` | `boolean` |
| `defaultValue` | `Node?` |
| `keyword` | `string` |
| `constraint` | `IdentifierNode?` |
| `typeSignature` | `TypeSignature` |
| `innerParameters` | `TemplateParameter[]` |

---


## `TypeDeclarator`

| Field | Type |
|---|---|
| `kind` | `string` |
| `isConst` | `boolean` |
| `isVolatile` | `boolean` |
| `arraySizeExpr` | `Node?` |

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
