---
title: Expression Nodes
---

## `LiteralNode` _(extends `ExpressionNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `udlSuffix` | `string` |

---


## `NumberLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `base` | `NumberBase` |
| `category` | `NumberCategory` |
| `value` | `string` |
| `suffix` | `string` |

---


## `StringLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `encoding` | `StringEncoding` |
| `isRaw` | `boolean` |
| `isMultiLine` | `boolean` |
| `value` | `string` |

---


## `ConcatenatedStringNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `parts` | `LiteralNode[]` |

---


## `CharLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `encoding` | `StringEncoding` |
| `value` | `string` |

---


## `BoolLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

| Field | Type |
|---|---|
| `value` | `boolean` |

---


## `NullptrLiteralNode` _(extends `LiteralNode`)_

_kind discriminant: `"Literal"`_

_No own serialized fields._

---


## `PointerExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"PointerExpression"`_

| Field | Type |
|---|---|
| `op` | `PointerExprOp` |
| `operand` | `Node?` |

---


## `FieldExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"FieldExpression"`_

| Field | Type |
|---|---|
| `object` | `Node?` |
| `op` | `FieldAccessOp` |
| `member` | `string` |

---


## `SubscriptExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"SubscriptExpression"`_

| Field | Type |
|---|---|
| `object` | `Node?` |
| `index` | `Node?` |

---


## `ParenthesizedExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ParenthesizedExpression"`_

| Field | Type |
|---|---|
| `inner` | `Node?` |

---


## `UnaryExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"UnaryExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `operand` | `Node?` |

---


## `BinaryExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"BinaryExpression"`_

| Field | Type |
|---|---|
| `lhs` | `Node?` |
| `op` | `string` |
| `rhs` | `Node?` |

---


## `UpdateExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"UpdateExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `isPrefix` | `boolean` |
| `operand` | `Node?` |

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


## `DeleteExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"DeleteExpression"`_

| Field | Type |
|---|---|
| `isArray` | `boolean` |
| `operand` | `Node?` |

---


## `CastExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CastExpression"`_

| Field | Type |
|---|---|
| `castKind` | `CastKind` |
| `targetType` | `TypeSignature` |
| `operand` | `Node?` |

---


## `IntrospectionExpressionNode` _(extends `ExpressionNode`)_

| Field | Type |
|---|---|
| `isTypeForm` | `boolean` |
| `typeOperand` | `TypeSignature` |
| `exprOperand` | `Node?` |

---


## `SizeofExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"SizeofExpression"`_

_No own serialized fields._

---


## `AlignofExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"AlignofExpression"`_

_No own serialized fields._

---


## `TypeidExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"TypeidExpression"`_

_No own serialized fields._

---


## `DecltypeExpressionNode` _(extends `IntrospectionExpressionNode`)_

_kind discriminant: `"DecltypeExpression"`_

_No own serialized fields._

---


## `CallExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CallExpression"`_

| Field | Type |
|---|---|
| `callKind` | `CallKind` |
| `callee` | `Node?` |
| `calleeIdentifier` | `IdentifierNode?` |
| `args` | `FunctionArgument[]` |

---


## `AssignmentExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"AssignmentExpression"`_

| Field | Type |
|---|---|
| `lhs` | `Node?` |
| `op` | `string` |
| `rhs` | `Node?` |

---


## `ConditionalExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ConditionalExpression"`_

| Field | Type |
|---|---|
| `condition` | `Node?` |
| `thenExpr` | `Node?` |
| `elseExpr` | `Node?` |

---


## `LambdaExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"LambdaExpression"`_

| Field | Type |
|---|---|
| `captureDefault` | `number` |
| `captures` | `LambdaCaptureItem[]` |
| `templateParameters` | `TemplateParameter[]` |
| `parameters` | `FunctionParameter[]` |
| `trailingReturn` | `TypeSignature` |
| `isMutable` | `boolean` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `body` | `BlockNode?` |

---


## `InitializerListNode` _(extends `ExpressionNode`)_

_kind discriminant: `"InitializerList"`_

| Field | Type |
|---|---|
| `elements` | `Node[]` |

---


## `FoldExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"FoldExpression"`_

| Field | Type |
|---|---|
| `op` | `string` |
| `leftOperand` | `Node?` |
| `rightOperand` | `Node?` |

---


## `ThrowExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ThrowExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `NoexceptExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"NoexceptExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `ThisExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"ThisExpression"`_

_No own serialized fields._

---


## `CoYieldExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CoYieldExpression"`_

| Field | Type |
|---|---|
| `operand` | `Node?` |

---


## `CoAwaitExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"CoAwaitExpression"`_

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


## `RequirementNode` _(extends `Node`)_

_No own serialized fields._

---


## `SimpleRequirementNode` _(extends `RequirementNode`)_

_kind discriminant: `"SimpleRequirement"`_

| Field | Type |
|---|---|
| `expression` | `Node?` |

---


## `TypeRequirementNode` _(extends `RequirementNode`)_

_kind discriminant: `"TypeRequirement"`_

| Field | Type |
|---|---|
| `typeName` | `TypeSignature` |

---


## `CompoundRequirementNode` _(extends `RequirementNode`)_

_kind discriminant: `"CompoundRequirement"`_

| Field | Type |
|---|---|
| `expression` | `Node?` |
| `isNoexcept` | `boolean` |
| `returnTypeConstraint` | `TypeSignature` |

---


## `RequiresExpressionNode` _(extends `ExpressionNode`)_

_kind discriminant: `"RequiresExpression"`_

| Field | Type |
|---|---|
| `parameters` | `FunctionParameter[]` |
| `requirements` | `RequirementNode[]` |

---
