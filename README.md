# quick-notes — LocalCode Plugin

A simple example plugin for [LocalCode](https://github.com/lsheasel/LocalCode).

The **agent** can save notes while working on a task. The **user** reads them with `/notes`.

---

## Installation
```
/plugin install lsheasel/LocalCode-Plugin
```

Available immediately after install — no restart needed.

---

## What does this plugin do?

### For the agent (Tools)

The LLM agent gets two new tools it can call on its own:

| Tool | Purpose |
|---|---|
| `save_note` | Saves a text note, optionally tagged (e.g. `"bug"`, `"todo"`) |
| `read_notes` | Reads back all saved notes, optionally filtered by tag |

Example: you tell the agent *"Analyze the project and note down all bugs"*. As it reads through files, it calls `save_note` to record its findings.

### For the user (Slash command)

| Command | Effect |
|---|---|
| `/notes` | Shows all saved notes |
| `/notes clear` | Deletes all notes |

Notes are stored in: `~/.localcode/quick-notes.json`

---

## File structure

```
LocalCode-Plugin/
├── localcode.plugin.json   ← Manifest: name, version, what the plugin registers
├── index.js                ← Code: register() function with tools and commands
└── README.md               ← This file
```

---

## How does a LocalCode plugin work?

### 1. The manifest — `localcode.plugin.json`

```json
{
  "name": "quick-notes",
  "version": "1.0.0",
  "description": "Lets the agent save notes during a task",
  "author": "Shease",
  "tools": ["save_note", "read_notes"],
  "commands": ["/notes"]
}
```

The manifest is the plugin's identity card. LocalCode reads it on startup and validates:
- `name` must be kebab-case (lowercase letters, numbers, hyphens)
- `version` must be valid semver (`1.0.0`)
- `tools` and `commands` list the names that `register()` will register

### 2. The code — `index.js` (CommonJS)

```js
module.exports = {
  register(registry) {
    // register tools and commands here
  }
}
```

The only requirement: the module must export an object with a `register` function.

LocalCode calls `register(registry)` on startup and passes a `registry` object with two methods:

#### `registry.addTool({ name, description, parameters, execute })`

Registers a tool the **LLM agent** can call.

```js
registry.addTool({
  name: 'save_note',
  description: 'Saves a note.',        // ← shown to the LLM in the system prompt
  parameters: {                         // ← JSON Schema of the arguments
    type: 'object',
    properties: {
      text: { type: 'string', description: 'The note text' }
    },
    required: ['text']
  },
  execute: async ({ text }) => {
    // perform the action
    // must return a string — the LLM receives this as the tool result
    return `Note saved: ${text}`
  }
})
```

**What happens under the hood:** the `description` is automatically injected into the system prompt so the LLM knows when to use the tool. The `parameters` schema tells the LLM which arguments to pass.

#### `registry.addCommand({ cmd, description, handler })`

Registers a **slash command** the user can type.

```js
registry.addCommand({
  cmd: '/notes',
  description: 'Show saved notes',
  handler: async (args, ctx) => {
    // args = everything after the command name (e.g. "clear" when user types "/notes clear")
    // ctx.cwd = current working directory
    return { type: 'done', content: 'Result goes here' }
  }
})
```

The handler returns an object:

| `type` | Display in terminal |
|---|---|
| `done` | Green success message |
| `text` | Plain text output |
| `error` | Red error message |
| `command` | Rich output with a title (add a `title` field) |

---

## Building your own plugin

1. Create a new folder: `my-plugin/`
2. Write `localcode.plugin.json` (name, version, list your tools/commands)
3. Write `index.js` with `module.exports = { register(registry) { ... } }`
4. Install with `/plugin install ./my-plugin`
5. After changes, reload with `/plugin reload` — no restart needed

### Tips

- `execute()` must always return a **string** — it goes back to the LLM as the tool result
- Errors thrown inside `execute()` do **not** crash the agent — LocalCode catches them and sends an error string to the LLM instead
- You can register both tools and commands, or just one of them (the manifest validator requires at least one entry in `tools`)
- Plugins run in the same Node.js process as LocalCode — you have full access to `fs`, `path`, `os`, and any npm modules
- CommonJS (`require`) is required — no ESM in `index.js`

---

## Notes file format

```json
[
  {
    "id": 1,
    "text": "Auth middleware has no rate limiting",
    "tag": "bug",
    "timestamp": "2026-05-12T14:23:11.000Z"
  }
]
```

Stored at `~/.localcode/quick-notes.json`. Persists between sessions until you run `/notes clear`.
