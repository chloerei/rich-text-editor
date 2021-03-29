import { schema } from "./schema"
import { TextSelection } from "prosemirror-state"
import { exitCode } from "prosemirror-commands"

import { EditorView, keymap, highlightActiveLine } from "@codemirror/view"
import { Transaction, EditorState, Compartment } from "@codemirror/state"
import { history, historyKeymap } from "@codemirror/history"
import { indentOnInput, getIndentUnit, indentString } from "@codemirror/language"
import { lineNumbers} from "@codemirror/gutter"
import { defaultKeymap, indentMore, indentSelection } from "@codemirror/commands"
import { bracketMatching } from "@codemirror/matchbrackets"
import {closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets"
import { classHighlightStyle } from "@codemirror/highlight"

import { StreamLanguage } from "@codemirror/stream-parser"
import { c, cpp, java, csharp, kotlin, objectiveC } from "@codemirror/legacy-modes/mode/clike"
import { css } from "@codemirror/legacy-modes/mode/css"
import { diff } from "@codemirror/legacy-modes/mode/diff"
import { erlang } from "@codemirror/legacy-modes/mode/erlang"
import { go } from "@codemirror/legacy-modes/mode/go"
import { haskell } from "@codemirror/legacy-modes/mode/haskell"
import { javascript, json, typescript } from "@codemirror/legacy-modes/mode/javascript"
import { python } from "@codemirror/legacy-modes/mode/python"
import { ruby } from "@codemirror/legacy-modes/mode/ruby"
import { rust } from "@codemirror/legacy-modes/mode/rust"
import { shell } from "@codemirror/legacy-modes/mode/shell"
import { sql } from "@codemirror/legacy-modes/mode/sql"
import { swift } from "@codemirror/legacy-modes/mode/swift"
import { html, xml } from "@codemirror/legacy-modes/mode/xml"
import { yaml } from "@codemirror/legacy-modes/mode/yaml"

const plainText = {
  token: (stream, state) => {
    stream.skipToEnd()
    return null
  }
}

const languages = {
  css: { name: 'CSS', config: css },
  c: { name: 'C', config: c },
  cpp: { name: 'C++', config: cpp },
  csharp: { name: 'CSharp', config: csharp },
  diff: { name: 'Diff', config: diff },
  erlang: { name: 'Erlang', config: erlang },
  go: { name: 'Go', config: go },
  haskell: { name: 'Haskell', config: haskell },
  java: { name: 'Java', config: java },
  javascript: { name: 'JavaScript', config: javascript },
  json: { name: 'JSON', config: json },
  kotlin: { name: 'Kotlin', config: kotlin },
  objectivec: { name: 'ObjectiveC', config: objectiveC },
  python: { name: 'Python', config: python },
  plaintext: { name: 'PlainText', config: plainText },
  ruby: { name: 'Ruby', config: ruby },
  rust: { name: 'Rust', config: rust },
  shell: { name: 'Shell', config: shell },
  sql: { name: 'SQL', config: sql },
  swift: { name: 'Swift', config: swift },
  typescript: { name: 'TypeScript', config: typescript },
  html: { name: 'HTML', config: html },
  xml: { name: 'XML', config: xml },
  yaml: { name: 'YAML', config: yaml }
}

function insertTab({state, dispatch}) {
  if (state.selection.ranges.some(r => !r.empty)) {
    return indentMore({state, dispatch})
  }

  dispatch(
    state.update(
      state.replaceSelection(indentString(state, getIndentUnit(state))),
      { scrollIntoView: true, annotations: Transaction.userEvent.of("input") }
    )
  )

  return true
}

import { StyleModule } from "style-mod"
StyleModule.mount = () => { /* Disabled it ! */ }

export class CodeBlockView {
  constructor(node, view, getPos) {
    this.node = node
    this.view = view
    this.getPos = getPos

    this.dom = document.createElement('div')
    this.dom.className = 'editor-code-block'
    this.dom.innerHTML = `
      <div class="editor-toolbar">
        <div class="editor-toolbar__space">
        </div>
        <div class="editor-toolbar__action">
          <select name="lang">
          </select>
        </div>
      </div>
    `

    this.langSelect = this.dom.querySelector('select[name="lang"]')
    for (const lang in languages) {
      let option = document.createElement('option')
      option.textContent = languages[lang].name
      option.value = lang
      this.langSelect.appendChild(option)
    }
    this.langSelect.value = this.node.attrs.lang || 'plaintext'
    this.langSelect.addEventListener('change', () => {
      this.view.dispatch(
        this.view.state.tr.setNodeMarkup(this.getPos(), null, { lang: this.langSelect.value } )
      )
    })

    this.language = new Compartment

    this.cm = new EditorView({
      state: EditorState.create({
        doc: node.textContent,
        extensions: [
          lineNumbers(),
          history(),
          indentOnInput(),
          classHighlightStyle,
          bracketMatching(),
          closeBrackets(),
          highlightActiveLine(),
          keymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap
          ]),

          this.language.of(StreamLanguage.define(plainText)),
          keymap.of([
            {
              key: 'Tab',
              run: insertTab,
              shift: indentSelection
            },
            {
              key: 'Mod-Enter',
              run: () => {
                if (exitCode(this.view.state, this.view.dispatch)) {
                  this.view.focus()
                }
              }
            }
          ]),
          EditorView.updateListener.of((update) => {
            if (!this.outerUpdating) {
              if (update.docChanged) {
                this.valueChanged()
              }

              if (update.selectionSet) {
                this.forwardSelection()
              }
            }
          })
        ]
      })
    })

    this.setLang(this.node.attrs.lang)
    this.dom.appendChild(this.cm.dom)
  }

  setSelection(anchor, head) {
    this.cm.focus()
    this.cm.state.update(
      { selection: { from: anchor, to: head } }
    )
  }

  update(node) {
    if (node.type != this.node.type) {
      return false
    }

    this.node = node

    if (!this.innerUpdating) {
      let change = this.computeChange(this.cm.state.doc.toString(), this.node.textContent)

      if (change) {
        this.outerUpdating = true
        this.cm.dispatch({
          changes: { from: change.from, to: change.to, insert: (change.text || '') }
        })
        this.outerUpdating = false
      }
    }

    this.setLang(this.node.attrs.lang)

    return true
  }

  setLang(lang) {
    if (this.currentLang != lang) {
      let langConfig = languages[lang] ? languages[lang].config : plainText
      this.cm.dispatch({
        effects: this.language.reconfigure(StreamLanguage.define(langConfig))
      })
      this.currentLang = lang
    }
  }

  stopEvent() {
    return true
  }

  valueChanged() {
    let change = this.computeChange(this.node.textContent, this.cm.state.doc.toString())
    if (change) {
      this.innerUpdating = true
      let offset = this.getPos() + 1
      let tr = this.view.state.tr.replaceWith(change.from + offset, change.to + offset, change.text ? schema.text(change.text) : null)
      this.view.dispatch(tr)
      this.innerUpdating = false
    }
  }

  computeChange(oldVal, newVal) {
    if (oldVal == newVal) {
      return null
    }
    let start = 0
    let oldEnd = oldVal.length
    let newEnd = newVal.length
    while (start < oldEnd && oldVal.charCodeAt(start) == newVal.charCodeAt(start)) {
      ++start
    }
    while (oldEnd > start &&
      newEnd > start &&
      oldVal.charCodeAt(oldEnd - 1) == newVal.charCodeAt(newEnd - 1)
    ) {
      oldEnd--; newEnd--
    }
    return {from: start, to: oldEnd, text: newVal.slice(start, newEnd)}
    }

  forwardSelection() {
    let { from, to } = this.cm.state.selection.ranges[0]
    let offset = this.getPos()
    let selection = TextSelection.create(this.view.state.doc, from + offset, to + offset)
    if (!selection.eq(this.view.state.selection)) {
      this.view.dispatch(this.view.state.tr.setSelection(selection))
    }
  }
}
