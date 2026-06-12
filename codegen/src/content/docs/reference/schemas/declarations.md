---
title: Declaration Nodes
---

## `AttributeDeclarationNode` _(extends `DeclarationNode`)_

_kind discriminant: `"AttributeDeclaration"`_

| Field | Type |
|---|---|
| `attributes` | `Attribute[]` |

---


## `TemplateNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Template"`_

| Field | Type |
|---|---|
| `parameters` | `TemplateParameter[]` |
| `requiresClause` | `Node?` |

---


## `NamespaceNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Namespace"`_

| Field | Type |
|---|---|
| `segments` | `NamespaceSegment[]` |
| `isAnonymous` | `boolean` |
| `isInline` | `boolean` |
| `children` | `Node[]` |

---


## `UsingNamespaceNode` _(extends `DeclarationNode`)_

_kind discriminant: `"UsingNamespace"`_

| Field | Type |
|---|---|
| `identifier` | `IdentifierNode?` |

---


## `StaticAssertNode` _(extends `DeclarationNode`)_

_kind discriminant: `"StaticAssert"`_

| Field | Type |
|---|---|
| `condition` | `Node?` |
| `message` | `string` |

---


## `NamespaceAliasNode` _(extends `DeclarationNode`)_

_kind discriminant: `"NamespaceAlias"`_

| Field | Type |
|---|---|
| `aliasName` | `string` |
| `targetNamespace` | `IdentifierNode?` |

---


## `TypedefNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Typedef"`_

| Field | Type |
|---|---|
| `aliasName` | `string` |
| `typeDecl` | `DeclarationNode?` |
| `targetType` | `TypeSignature?` |

---


## `TypeAliasNode` _(extends `DeclarationNode`)_

_kind discriminant: `"TypeAlias"`_

| Field | Type |
|---|---|
| `aliasName` | `string` |
| `targetType` | `TypeSignature` |
| `templateDecl` | `Node?` |

---


## `UsingDeclarationNode` _(extends `DeclarationNode`)_

_kind discriminant: `"UsingDeclaration"`_

| Field | Type |
|---|---|
| `aliasName` | `string` |
| `targetType` | `TypeSignature` |

---


## `EnumNode` _(extends `DeclarationNode`)_

_kind discriminant: `"EnumeratorSpecifier"`_

| Field | Type |
|---|---|
| `identifier` | `IdentifierNode?` |
| `underlyingType` | `TypeSignature` |
| `isScoped` | `boolean` |
| `isForwardDeclaration` | `boolean` |
| `enumerators` | `Node[]` |

---


## `EnumSpecifierNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Enumerator"`_

| Field | Type |
|---|---|
| `name` | `string` |
| `value` | `Node?` |

---


## `VariableNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Variable"`_

| Field | Type |
|---|---|
| `isStatic` | `boolean` |
| `isConstexpr` | `boolean` |
| `isThreadLocal` | `boolean` |
| `isInline` | `boolean` |
| `isExtern` | `boolean` |
| `isConstinit` | `boolean` |
| `attributes` | `Attribute[]` |
| `alignasExprs` | `string[]` |
| `typeSignature` | `TypeSignature` |
| `identifier` | `IdentifierNode?` |
| `defaultValue` | `Node?` |

---


## `VariableGroupNode` _(extends `DeclarationNode`)_

_kind discriminant: `"VariableGroup"`_

| Field | Type |
|---|---|
| `variables` | `VariableNode[]` |

---


## `StructuredBindingNode` _(extends `DeclarationNode`)_

_kind discriminant: `"StructuredBinding"`_

| Field | Type |
|---|---|
| `names` | `string[]` |
| `typeSignature` | `TypeSignature` |
| `initializer` | `Node?` |
| `isStatic` | `boolean` |
| `isConstexpr` | `boolean` |
| `isConstinit` | `boolean` |
| `isThreadLocal` | `boolean` |
| `isInline` | `boolean` |

---


## `ConceptNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Concept"`_

| Field | Type |
|---|---|
| `identifier` | `IdentifierNode?` |
| `constraintExpr` | `Node?` |
| `templateDecl` | `Node?` |

---


## `FunctionNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Function"`_

| Field | Type |
|---|---|
| `isStatic` | `boolean` |
| `isConst` | `boolean` |
| `isVolatile` | `boolean` |
| `isVirtual` | `boolean` |
| `isPureVirtual` | `boolean` |
| `isOverride` | `boolean` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `isFinal` | `boolean` |
| `isInline` | `boolean` |
| `isConstexpr` | `boolean` |
| `isConsteval` | `boolean` |
| `isExplicit` | `boolean` |
| `explicitCondition` | `Node?` |
| `isDefaulted` | `boolean` |
| `isDeleted` | `boolean` |
| `isTrailingReturn` | `boolean` |
| `refQualifier` | `RefQualifier` |
| `requiresClause` | `Node?` |
| `body` | `BlockNode?` |
| `attributes` | `Attribute[]` |
| `returnSignature` | `TypeSignature` |
| `identifier` | `IdentifierNode?` |
| `parameters` | `FunctionParameter[]` |
| `templateDecl` | `Node?` |
| `templateArgs` | `TemplateArgument[]` |

---


## `ConstructorNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Constructor"`_

| Field | Type |
|---|---|
| `isExplicit` | `boolean` |
| `explicitCondition` | `Node?` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `isDefaulted` | `boolean` |
| `isDeleted` | `boolean` |
| `isConstexpr` | `boolean` |
| `isInline` | `boolean` |
| `isCopyConstructor` | `boolean` |
| `isMoveConstructor` | `boolean` |
| `requiresClause` | `Node?` |
| `body` | `BlockNode?` |
| `attributes` | `Attribute[]` |
| `identifier` | `IdentifierNode?` |
| `parameters` | `FunctionParameter[]` |
| `templateDecl` | `Node?` |
| `templateArgs` | `TemplateArgument[]` |

---


## `DestructorNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Destructor"`_

| Field | Type |
|---|---|
| `isVirtual` | `boolean` |
| `isPureVirtual` | `boolean` |
| `isDefaulted` | `boolean` |
| `isDeleted` | `boolean` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `isInline` | `boolean` |
| `isConstexpr` | `boolean` |
| `requiresClause` | `Node?` |
| `body` | `BlockNode?` |
| `attributes` | `Attribute[]` |
| `identifier` | `IdentifierNode?` |

---


## `OperatorNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Operator"`_

| Field | Type |
|---|---|
| `isStatic` | `boolean` |
| `isConst` | `boolean` |
| `isVolatile` | `boolean` |
| `isVirtual` | `boolean` |
| `isPureVirtual` | `boolean` |
| `isOverride` | `boolean` |
| `isNoexcept` | `boolean` |
| `noexceptCondition` | `Node?` |
| `isFinal` | `boolean` |
| `isInline` | `boolean` |
| `isConstexpr` | `boolean` |
| `isExplicit` | `boolean` |
| `explicitCondition` | `Node?` |
| `isDefaulted` | `boolean` |
| `isDeleted` | `boolean` |
| `isTrailingReturn` | `boolean` |
| `refQualifier` | `RefQualifier` |
| `requiresClause` | `Node?` |
| `body` | `BlockNode?` |
| `attributes` | `Attribute[]` |
| `operatorSymbol` | `string` |
| `returnSignature` | `TypeSignature` |
| `castTargetType` | `TypeSignature` |
| `parameters` | `FunctionParameter[]` |
| `templateDecl` | `Node?` |
| `templateArgs` | `TemplateArgument[]` |

---


## `UnionNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Union"`_

| Field | Type |
|---|---|
| `isAnonymous` | `boolean` |
| `isForwardDeclaration` | `boolean` |
| `attributes` | `Attribute[]` |
| `alignasExprs` | `string[]` |
| `identifier` | `IdentifierNode?` |
| `templateDecl` | `Node?` |
| `templateArgs` | `TemplateArgument[]` |
| `memberVariables` | `Node[]` |
| `memberFunctions` | `Node[]` |
| `staticMemberVariables` | `Node[]` |
| `staticMemberFunctions` | `Node[]` |
| `constructors` | `Node[]` |
| `destructors` | `Node[]` |
| `operators` | `Node[]` |
| `nestedTypes` | `Node[]` |

---


## `FriendNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Friend"`_

| Field | Type |
|---|---|
| `kind` | `string` |
| `identifier` | `IdentifierNode?` |

---


## `StructNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Struct"`_

| Field | Type |
|---|---|
| `isFinal` | `boolean` |
| `isForwardDeclaration` | `boolean` |
| `attributes` | `Attribute[]` |
| `alignasExprs` | `string[]` |
| `identifier` | `IdentifierNode?` |
| `templateDecl` | `Node?` |
| `templateArgs` | `TemplateArgument[]` |
| `baseClasses` | `[?, IdentifierNode][]` |
| `derivedClasses` | `string[]` |
| `memberVariables` | `Node[]` |
| `memberFunctions` | `Node[]` |
| `staticMemberVariables` | `Node[]` |
| `staticMemberFunctions` | `Node[]` |
| `constructors` | `Node[]` |
| `destructors` | `Node[]` |
| `operators` | `Node[]` |
| `friends` | `Node[]` |
| `nestedTypes` | `Node[]` |
| `statements` | `Node[]` |

---


## `ClassNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Class"`_

| Field | Type |
|---|---|
| `isFinal` | `boolean` |
| `isForwardDeclaration` | `boolean` |
| `attributes` | `Attribute[]` |
| `alignasExprs` | `string[]` |
| `identifier` | `IdentifierNode?` |
| `templateDecl` | `Node?` |
| `templateArgs` | `TemplateArgument[]` |
| `baseClasses` | `[?, IdentifierNode][]` |
| `derivedClasses` | `string[]` |
| `memberVariables` | `[?, Node][]` |
| `memberFunctions` | `[?, Node][]` |
| `staticMemberVariables` | `[?, Node][]` |
| `staticMemberFunctions` | `[?, Node][]` |
| `constructors` | `[?, Node][]` |
| `destructors` | `[?, Node][]` |
| `operators` | `[?, Node][]` |
| `friends` | `[?, Node][]` |
| `nestedTypes` | `[?, Node][]` |
| `statements` | `Node[]` |

---


## `ModuleNode` _(extends `DeclarationNode`)_

_kind discriminant: `"Module"`_

| Field | Type |
|---|---|
| `moduleName` | `string` |
| `partition` | `string` |
| `isExported` | `boolean` |
| `isGlobalFragment` | `boolean` |
| `isPrivateFragment` | `boolean` |
| `children` | `Node[]` |

---


## `ModuleImportNode` _(extends `DeclarationNode`)_

_kind discriminant: `"ModuleImport"`_

| Field | Type |
|---|---|
| `moduleName` | `string` |
| `partition` | `string` |
| `header` | `string` |
| `isSystem` | `boolean` |
| `isExported` | `boolean` |

---


## `ExternCNode` _(extends `DeclarationNode`)_

_kind discriminant: `"ExternC"`_

| Field | Type |
|---|---|
| `language` | `string` |
| `isBlock` | `boolean` |
| `children` | `Node[]` |

---


## `ExportDeclarationNode` _(extends `DeclarationNode`)_

_kind discriminant: `"ExportDeclaration"`_

| Field | Type |
|---|---|
| `children` | `Node[]` |

---
