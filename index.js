// quick-notes plugin for LocalCode
// Stores notes in ~/.localcode/quick-notes.json
// The LLM agent can save notes while working; the user reads them with /notes.

const fs   = require('fs')
const path = require('path')
const os   = require('os')

const NOTES_FILE = path.join(os.homedir(), '.localcode', 'quick-notes.json')

// ── Helpers ──────────────────────────────────────────────────────────────────

function loadNotes() {
  try {
    return JSON.parse(fs.readFileSync(NOTES_FILE, 'utf-8'))
  } catch {
    return []
  }
}

function saveNotes(notes) {
  const dir = path.dirname(NOTES_FILE)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(NOTES_FILE, JSON.stringify(notes, null, 2), 'utf-8')
}

// ── Plugin registration ───────────────────────────────────────────────────────

module.exports = {
  register(registry) {

    // ── Tool: save_note ───────────────────────────────────────────────────────
    // The LLM calls this to save an important finding during a task.
    registry.addTool({
      name: 'save_note',
      description: 'Save an important note or finding so the user can review it later with /notes.',
      parameters: {
        type: 'object',
        properties: {
          text: {
            type: 'string',
            description: 'The note text to save'
          },
          tag: {
            type: 'string',
            description: 'Optional short tag, e.g. "bug", "idea", "todo"'
          }
        },
        required: ['text']
      },
      execute: async ({ text, tag }) => {
        const notes  = loadNotes()
        const entry  = {
          id:        notes.length + 1,
          text:      String(text),
          tag:       tag ? String(tag) : null,
          timestamp: new Date().toISOString(),
        }
        notes.push(entry)
        saveNotes(notes)
        return `Note #${entry.id} saved${entry.tag ? ` [${entry.tag}]` : ''}.`
      }
    })

    // ── Tool: read_notes ──────────────────────────────────────────────────────
    // The LLM can read back all saved notes (e.g. to summarize or continue work).
    registry.addTool({
      name: 'read_notes',
      description: 'Read all saved notes. Use this to recall findings from earlier in the task.',
      parameters: {
        type: 'object',
        properties: {
          tag: {
            type: 'string',
            description: 'Optional: filter by tag'
          }
        }
      },
      execute: async ({ tag }) => {
        let notes = loadNotes()
        if (tag) notes = notes.filter(n => n.tag === String(tag))
        if (notes.length === 0) return tag ? `No notes with tag "${tag}".` : 'No notes saved yet.'
        return notes
          .map(n => `#${n.id}${n.tag ? ` [${n.tag}]` : ''}: ${n.text}  (${n.timestamp})`)
          .join('\n')
      }
    })

    // ── Command: /notes ───────────────────────────────────────────────────────
    // The user types /notes to see all saved notes, or /notes clear to wipe them.
    registry.addCommand({
      cmd: '/notes',
      description: 'Show saved notes (/notes) or clear them (/notes clear)',
      handler: async (args, _ctx) => {
        const sub = args.trim().toLowerCase()

        if (sub === 'clear') {
          saveNotes([])
          return { type: 'done', content: 'All notes cleared.' }
        }

        const notes = loadNotes()
        if (notes.length === 0) {
          return { type: 'text', content: 'No notes yet. Ask the agent to save_note during a task.' }
        }

        const lines = notes.map(n => {
          const tag  = n.tag ? ` [${n.tag}]` : ''
          const date = new Date(n.timestamp).toLocaleString()
          return `#${n.id}${tag}  ${date}\n   ${n.text}`
        })

        return {
          type: 'done',
          content: `${notes.length} note(s):\n\n` + lines.join('\n\n'),
        }
      }
    })
  }
}
