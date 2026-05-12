# quick-notes — LocalCode Plugin

Ein einfaches Beispiel-Plugin für [LocalCode](https://github.com/lsheasel/LocalCode).

Der **Agent** kann während einer Aufgabe Notizen speichern. Der **User** liest sie mit `/notes`.

---

## Installation

```
/plugin install C:\Users\<dein-name>\Desktop\Coding\LocalCode-Plugin
```

Oder wenn du es auf GitHub hochgeladen hast:

```
/plugin install dein-username/LocalCode-Plugin
```

Nach der Installation ohne Neustart sofort verfügbar.

---

## Was kann das Plugin?

### Für den Agent (Tools)

Der LLM-Agent bekommt zwei neue Werkzeuge, die er selbst aufrufen kann:

| Tool | Wofür |
|---|---|
| `save_note` | Speichert einen Text (optional mit Tag wie `"bug"` oder `"todo"`) |
| `read_notes` | Liest alle gespeicherten Notizen zurück (optional nach Tag gefiltert) |

Beispiel: Du sagst dem Agent *"Analysiere das Projekt und merke dir alle Bugs"*. Während er Dateien liest, ruft er `save_note` auf, um Findings zu speichern.

### Für den User (Slash-Command)

| Befehl | Wirkung |
|---|---|
| `/notes` | Zeigt alle gespeicherten Notizen an |
| `/notes clear` | Löscht alle Notizen |

Notizen werden gespeichert in: `~/.localcode/quick-notes.json`

---

## Dateistruktur

```
LocalCode-Plugin/
├── localcode.plugin.json   ← Manifest: Name, Version, was das Plugin registriert
├── index.js                ← Code: register()-Funktion mit Tools und Commands
└── README.md               ← Diese Datei
```

---

## Wie funktioniert ein LocalCode Plugin?

### 1. Das Manifest — `localcode.plugin.json`

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

Das Manifest ist die Identitätskarte des Plugins. LocalCode liest es beim Laden und prüft:
- `name` muss kebab-case sein (Kleinbuchstaben, Zahlen, Bindestriche)
- `version` muss gültiges semver sein (`1.0.0`)
- `tools` und `commands` listen die Namen auf, die `register()` später registriert

### 2. Der Code — `index.js` (CommonJS)

```js
module.exports = {
  register(registry) {
    // Tools und Commands hier registrieren
  }
}
```

Die einzige Pflicht: das Modul muss ein Objekt mit einer `register`-Funktion exportieren.

LocalCode ruft `register(registry)` beim Start auf und übergibt ein `registry`-Objekt mit zwei Methoden:

#### `registry.addTool({ name, description, parameters, execute })`

Registriert ein Werkzeug, das der **LLM-Agent** aufrufen kann.

```js
registry.addTool({
  name: 'save_note',
  description: 'Speichert eine Notiz.',   // ← wird dem LLM im System-Prompt gezeigt
  parameters: {                            // ← JSON Schema der Argumente
    type: 'object',
    properties: {
      text: { type: 'string', description: 'Der Notiztext' }
    },
    required: ['text']
  },
  execute: async ({ text }) => {
    // Führe die Aktion aus
    // Muss einen String zurückgeben — das bekommt der LLM als Ergebnis
    return `Notiz gespeichert: ${text}`
  }
})
```

**Was passiert im Hintergrund:** Der `description`-Text wird automatisch in den System-Prompt eingefügt, damit der LLM weiß, wann er das Tool nutzen soll. Das `parameters`-Schema zeigt dem LLM, welche Argumente er übergeben muss.

#### `registry.addCommand({ cmd, description, handler })`

Registriert einen **Slash-Command**, den der User eintippen kann.

```js
registry.addCommand({
  cmd: '/notes',
  description: 'Zeigt gespeicherte Notizen',
  handler: async (args, ctx) => {
    // args = alles nach dem Command-Namen (z.B. "clear" wenn User "/notes clear" tippt)
    // ctx.cwd = aktuelles Arbeitsverzeichnis
    return { type: 'done', content: 'Ergebnis hier' }
  }
})
```

Der Handler gibt ein Objekt zurück:

| `type` | Darstellung im Terminal |
|---|---|
| `done` | Grüne Erfolgs-Nachricht |
| `text` | Einfacher Text |
| `error` | Rote Fehlermeldung |
| `command` | Rich-Output mit Titel (`title`-Feld) |

---

## Eigenes Plugin bauen

1. Neuen Ordner anlegen: `mein-plugin/`
2. `localcode.plugin.json` erstellen (Name, Version, Tools/Commands auflisten)
3. `index.js` schreiben mit `module.exports = { register(registry) { ... } }`
4. Mit `/plugin install ./mein-plugin` installieren
5. Mit `/plugin reload` nach Änderungen neu laden — kein Neustart nötig

### Tipps

- `execute()` muss immer einen **String** zurückgeben — der geht als Ergebnis zurück an den LLM
- Fehler in `execute()` crashen den Agent **nicht** — LocalCode fängt sie ab und gibt eine Fehlermeldung an den LLM
- Du kannst sowohl Tools als auch Commands registrieren, oder nur eines von beiden (der Manifest-Validator erwartet aber mindestens einen Eintrag in `tools`)
- Plugins laufen im selben Node.js-Prozess wie LocalCode — du hast vollen Zugriff auf `fs`, `path`, `os`, npm-Module etc.
- CommonJS (`require`) ist Pflicht — kein ESM in `index.js`

---

## Notizen-Datei

```json
[
  {
    "id": 1,
    "text": "Auth-Middleware hat kein Rate-Limiting",
    "tag": "bug",
    "timestamp": "2026-05-12T14:23:11.000Z"
  }
]
```

Gespeichert in `~/.localcode/quick-notes.json`. Bleibt zwischen Sessions erhalten — solange du nicht `/notes clear` ausführst.
