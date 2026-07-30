---
description: Crea un git worktree aislado en .trees/ y ejecuta ahí el requerimiento indicado
argument-hint: <requerimiento a implementar>
allowed-tools: Bash(git worktree:*), Bash(git branch:*), Bash(git status:*), Bash(git log:*), Bash(git diff:*), Bash(git add:*), Bash(git commit:*), Read, Write, Edit, Glob, Grep
---

# Trabajo aislado en worktree

Requerimiento del usuario:

<requerimiento>
$ARGUMENTS
</requerimiento>

Si `<requerimiento>` viene vacío, pregunta al usuario qué debe implementarse y detente.

## 1. Determinar el nombre

Deriva tú mismo el nombre del worktree a partir del requerimiento:

- kebab-case, en inglés, sin acentos ni caracteres especiales
- 2 a 4 palabras, máximo 30 caracteres
- prefijo según la naturaleza del trabajo: `feat-`, `fix-`, `refactor-`, `docs-`, `chore-`
- ejemplos: `feat-hold-piece`, `fix-rotation-kick`, `refactor-score-module`

Si `.trees/<nombre>` ya existe, añade un sufijo numérico: `-2`, `-3`, etc.

## 2. Crear el worktree

Desde la raíz del repositorio principal:

```bash
git worktree add .trees/<nombre> -b <nombre>
```

La rama parte de `HEAD` actual. Si la rama ya existe, usa `git worktree add .trees/<nombre> <nombre>` sin `-b`.

Verifica que `.trees/` esté en `.gitignore`; si no lo está, agrégalo (en el repo principal, no en el worktree).

## 3. Ejecutar el requerimiento DENTRO del worktree

Regla dura de aislamiento:

- **Toda** lectura y escritura de archivos usa rutas bajo `.trees/<nombre>/`.
- **Nunca** edites archivos del árbol principal durante esta tarea. Única excepción: la línea de `.gitignore` del paso 2.
- Los comandos `git` de la tarea (status, diff, add, commit) se ejecutan con `git -C .trees/<nombre> ...`.
- No hagas `git checkout` ni cambies de rama en el árbol principal.

Implementa el requerimiento completo ahí: código, ajustes y verificación (tests o build del proyecto si existen).

## 4. Reportar

Al terminar, informa en formato corto:

- ruta del worktree y nombre de la rama
- archivos tocados
- resultado de tests/build (si se corrieron)
- comandos para revisar y para integrar:

```bash
cd .trees/<nombre>          # revisar
git -C .trees/<nombre> log --oneline -n 5
git merge <nombre>          # integrar desde main, cuando el usuario lo pida
git worktree remove .trees/<nombre>   # limpiar
```

No hagas merge ni borres el worktree salvo que el usuario lo pida explícitamente. No hagas `push` salvo petición explícita.
