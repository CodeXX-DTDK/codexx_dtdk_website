---
title: Expression Nodes
---

## `AlignofExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"AlignofExpression"`_

_No own serialized fields._

---


## `AssignmentExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"AssignmentExpression"`_

| Field | Type |
|---|---|
| `lhs` | `Node?` |
| `op` | `string` |
| `rhs` | `Node?` |

---


## `BinaryExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"BinaryExpression"`_

| Field | Type |
|---|---|
| `lhs` | `Node?` |
| `op` | `string` |
| `rhs` | `Node?` |

---


## `BoolLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `value` | `boolean` |
| `_litSubtype` | `number` (always `5`) |

---


## `CallExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CallExpression"`_

| Field | Type |
|---|---|
| `callKind` | `string` |
| `callee` | `Node?` |
| `calleeIdentifier` | `IdentifierNode?` |
| `args` | `FunctionArgument[]` |

---


## `CastExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CastExpression"`_

| Field | Type |
|---|---|
| `castKind` | `string` |
| `targetType` | `TypeSignature` |
| `operand` | `Node?` |

---


## `CharLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `encoding` | `string` |
| `value` | `string` |
| `_litSubtype` | `number` (always `4`) |

---


## `CoAwaitExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CoAwaitExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `CoYieldExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CoYieldExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `CommaExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CommaExpression"`_

| Field | Type |
|---|---|
| `lhs` | `Node?` |
| `rhs` | `Node?` |

---


## `CompoundRequirementNode` _(extends `RequirementNode`)_

_kind discriminant: `"CompoundRequirement"`_

| Field | Type |
|---|---|
| `expression` | `Node?` |
| `isNoexcept` | `boolean` |
| `returnTypeConstraint` | `TypeSignature` |

---


## `ConcatenatedStringNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `parts` | `LiteralNode[]` |
| `_litSubtype` | `number` (always `3`) |

---


## `ConditionalExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ConditionalExpression"`_

| Field | Type |
|---|---|
| `condition` | `Node?` |
| `thenExpr` | `Node?` |
| `elseExpr` | `Node?` |

---


## `DecltypeExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"DecltypeExpression"`_

_No own serialized fields._

---


## `DeleteExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"DeleteExpression"`_

| Field | Type |
|---|---|
| `isArray` | `boolean` |
| `operand` | `Node?` |

---


## `DesignatedInitializerNode` _(extends `ExpressionNode`)_

_kind discriminant: `"DesignatedInitializer"`_

| Field | Type |
|---|---|
| `designator` | `IdentifierNode?` |
| `value` | `Node?` |

---


## `FieldExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"FieldExpression"`_

| Field | Type |
|---|---|
| `object` | `Node?` |
| `op` | `string` |
| `member` | `IdentifierNode?` |

---


## `FoldExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"FoldExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `leftOperand` | `Node?` |
| `rightOperand` | `Node?` |

---


## `InitializerListNode` _(extends `ExpressionNode`)_

_kind discriminant: `"InitializerList"`_

| Field | Type |
|---|---|
| `elements` | `Node[]` |

---


## `IntrospectionExpressionNode` _(extends `ExpressionNode`)_

| Field | Type |
|---|---|
| `isTypeForm` | `boolean` |
| `typeOperand` | `TypeSignature` |
| `exprOperand` | `Node?` |

---


## `LambdaExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"LambdaExpression"`_

| Field | Type |
|---|---|
| `captureDefault` | `string` |
| `captures` | `LambdaCaptureItem[]` |
| `templateParameters` | `TemplateParameter[]` |
| `parameters` | `FunctionParameter[]` |
| `trailingReturn` | `TypeSignature` |
| `isMutable` | `boolean` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `body` | `BlockNode?` |

---


## `LiteralNode` _(extends `ExpressionNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `udlSuffix` | `string` |

---


## `NewExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"NewExpression"`_

| Field | Type |
|---|---|
| `typeSignature` | `TypeSignature` |
| `isArray` | `boolean` |
| `arraySize` | `Node?` |
| `placementArgs` | `Node[]` |
| `constructorArgs` | `Node[]` |

---


## `NoexceptExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"NoexceptExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `NullptrLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `_litSubtype` | `number` (always `6`) |

---


## `NumberLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `base` | `string` |
| `category` | `string` |
| `value` | `string` |
| `suffix` | `string` |
| `_litSubtype` | `number` (always `1`) |

---


## `ParenthesizedExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ParenthesizedExpression"`_

| Field | Type |
|---|---|
| `inner` | `Node?` |

---


## `PointerExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"PointerExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `operand` | `Node?` |

---


## `RequirementNode` _(extends `Node`)_

_No own serialized fields._

---


## `RequiresExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"RequiresExpression"`_

| Field | Type |
|---|---|
| `parameters` | `FunctionParameter[]` |
| `requirements` | `RequirementNode[]` |

---


## `SimpleRequirementNode` _(extends `RequirementNode`)_

_kind discriminant: `"SimpleRequirement"`_

| Field | Type |
|---|---|
| `expression` | `Node?` |

---


## `SizeofExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"SizeofExpression"`_

_No own serialized fields._

---


## `StringLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `encoding` | `string` |
| `isRaw` | `boolean` |
| `isMultiLine` | `boolean` |
| `value` | `string` |
| `_litSubtype` | `number` (always `2`) |

---


## `SubscriptExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"SubscriptExpression"`_

| Field | Type |
|---|---|
| `object` | `Node?` |
| `index` | `Node?` |

---


## `ThisExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ThisExpression"`_

_No own serialized fields._

---


## `ThrowExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ThrowExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `TypeRequirementNode` _(extends `RequirementNode`)_

_kind discriminant: `"TypeRequirement"`_

| Field | Type |
|---|---|
| `typeName` | `TypeSignature` |

---


## `TypeidExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"TypeidExpression"`_

_No own serialized fields._

---


## `UnaryExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"UnaryExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `operand` | `Node?` |

---


## `UpdateExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"UpdateExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `isPrefix` | `boolean` |
| `operand` | `Node?` |

---
