import { TextSelection, Selection } from "prosemirror-state"
import { exitCode } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { keymap } from "prosemirror-keymap"
import { schema } from "./schema"

import { keymap as cmKeymap, EditorView as cmEditorView, highlightSpecialChars, drawSelection, highlightActiveLine } from "@codemirror/view"
import { Extension, EditorState as cmEditorState, Prec } from "@codemirror/state"
import { history, historyKeymap } from "@codemirror/history"
import { indentOnInput } from "@codemirror/language"
import { lineNumbers } from "@codemirror/gutter"
import { defaultKeymap } from "@codemirror/commands"
import { bracketMatching } from "@codemirror/matchbrackets"
import { closeBrackets, closeBracketsKeymap } from "@codemirror/closebrackets"
import { defaultHighlightStyle } from "@codemirror/highlight"
import { StreamLanguage } from "@codemirror/stream-parser"
import { ruby } from "@codemirror/legacy-modes/mode/ruby"

const avaliableLangs = ['javascript']

export class CodeBlockView {
  constructor(node, view, getPos) {
    this.node = node
    this.view = view
    this.getPos = getPos
    this.incomingChanges = false

    this.dom = document.createElement('div')
    this.dom.className = 'editor-code-block'

    this.dom.innerHTML = `<div class="editor-toolbar">
        <div class="editor-toolbar__title">
        </div>
        <div class="editor-toolbar__action">
          <select class="editor-select" data-target="select">
          </select>
        </div>
      </div>
      <div class="editor-code_block__content" data-target="content">
      </div>`

    this.langSelect = this.dom.querySelector('[data-target="select"]')

    const defaultOption = document.createElement('option')
    defaultOption.textContent = 'language'
    this.langSelect.appendChild(defaultOption)
    avaliableLangs.forEach((lang) => {
      const option = document.createElement('option')
      option.value = lang
      option.textContent = lang
      this.langSelect.appendChild(option)
    })

    this.contentTarget = this.dom.querySelector('[data-target="content"]')
    this.cm = new cmEditorView({
      state: cmEditorState.create({
        extensions: [
          lineNumbers(),
          history(),
          indentOnInput(),
          Prec.fallback(defaultHighlightStyle),
          bracketMatching(),
          closeBrackets(),
          highlightSpecialChars(),
          highlightActiveLine(),
          cmKeymap.of([
            ...closeBracketsKeymap,
            ...defaultKeymap,
            ...historyKeymap
          ]),
          StreamLanguage.define(ruby)
        ]
      }),
      parent: this.contentTarget
    })
    // this.dom = this.cm.getWrapperElement()
    // this.cm.getWrapperElement().setAttribute('contenteditable', false)

    // CodeMirror needs to be in the DOM to properly initialize, so
    // schedule it to update itself
    // setTimeout(() => this.cm.refresh(), 20)

    // This flag is used to avoid an update loop between the outer and
    // inner editor
    // this.updating = false
    // Track whether changes are have been made but not yet propagated
    // this.cm.on("beforeChange", () => this.incomingChanges = true)
    // Propagate updates from the code editor to ProseMirror
    // this.cm.on("cursorActivity", () => {
    //   if (!this.updating && !this.incomingChanges) this.forwardSelection()
    // })
    // this.cm.on("changes", () => {
    //   if (!this.updating) {
    //     this.valueChanged()
    //     this.forwardSelection()
    //   }
    //   this.incomingChanges = false
    // })
    // this.cm.on("focus", () => this.forwardSelection())
    //
    // this.langSelect.addEventListener('change', (event) => {
    //   this.cm.setOption('mode', this.langSelect.value)
    // })
  }

  // forwardSelection() {
  //   if (!this.cm.hasFocus()) return
  //   let state = this.view.state
  //   let selection = this.asProseMirrorSelection(state.doc)
  //   if (!selection.eq(state.selection))
  //     this.view.dispatch(state.tr.setSelection(selection))
  // }
  //
  // asProseMirrorSelection(doc) {
  //   let offset = this.getPos() + 1
  //   let anchor = this.cm.indexFromPos(this.cm.getCursor("anchor")) + offset
  //   let head = this.cm.indexFromPos(this.cm.getCursor("head")) + offset
  //   return TextSelection.create(doc, anchor, head)
  // }
  //
  // setSelection(anchor, head) {
  //   this.cm.focus()
  //   this.updating = true
  //   this.cm.setSelection(this.cm.posFromIndex(anchor),
  //                        this.cm.posFromIndex(head))
  //   this.updating = false
  // }
  //
  // valueChanged() {
  //   let change = computeChange(this.node.textContent, this.cm.getValue())
  //   if (change) {
  //     let start = this.getPos() + 1
  //     let tr = this.view.state.tr.replaceWith(
  //       start + change.from, start + change.to,
  //       change.text ? schema.text(change.text) : null)
  //     this.view.dispatch(tr)
  //   }
  // }
  //
  // codeMirrorKeymap() {
  //   let view = this.view
  //   let mod = /Mac/.test(navigator.platform) ? "Cmd" : "Ctrl"
  //   return CodeMirror.normalizeKeyMap({
  //     Up: () => this.maybeEscape("line", -1),
  //     Left: () => this.maybeEscape("char", -1),
  //     Down: () => this.maybeEscape("line", 1),
  //     Right: () => this.maybeEscape("char", 1),
  //     "Cmd-Enter": () => {
  //       if (exitCode(view.state, view.dispatch)) view.focus()
  //     },
  //     "Alt-Enter": () => {
  //       if (exitCode(view.state, view.dispatch)) view.focus()
  //     },
  //     [`${mod}-Z`]: () => undo(view.state, view.dispatch),
  //     [`Shift-${mod}-Z`]: () => redo(view.state, view.dispatch),
  //     [`${mod}-Y`]: () => redo(view.state, view.dispatch),
  //     "Cmd-M": () => {
  //       console.log(view.state.selection)
  //       console.log(view.coordsAtPos(view.state.selection.head))
  //     }
  //   })
  // }
  //
  // maybeEscape(unit, dir) {
  //   let pos = this.cm.getCursor()
  //   if (this.cm.somethingSelected() ||
  //       pos.line != (dir < 0 ? this.cm.firstLine() : this.cm.lastLine()) ||
  //       (unit == "char" &&
  //        pos.ch != (dir < 0 ? 0 : this.cm.getLine(pos.line).length)))
  //     return CodeMirror.Pass
  //   this.view.focus()
  //   let targetPos = this.getPos() + (dir < 0 ? 0 : this.node.nodeSize)
  //   let selection = Selection.near(this.view.state.doc.resolve(targetPos), dir)
  //   this.view.dispatch(this.view.state.tr.setSelection(selection).scrollIntoView())
  //   this.view.focus()
  // }
  //
  // update(node) {
  //   if (node.type != this.node.type) return false
  //   this.node = node
  //   let change = computeChange(this.cm.getValue(), node.textContent)
  //   if (change) {
  //     this.updating = true
  //     this.cm.replaceRange(change.text, this.cm.posFromIndex(change.from),
  //                          this.cm.posFromIndex(change.to))
  //     this.updating = false
  //   }
  //   return true
  // }
  //
  // selectNode() { this.cm.focus() }
  // stopEvent() { return true }
}

function computeChange(oldVal, newVal) {
  if (oldVal == newVal) return null
  let start = 0, oldEnd = oldVal.length, newEnd = newVal.length
  while (start < oldEnd && oldVal.charCodeAt(start) == newVal.charCodeAt(start)) ++start
  while (oldEnd > start && newEnd > start &&
         oldVal.charCodeAt(oldEnd - 1) == newVal.charCodeAt(newEnd - 1)) { oldEnd--; newEnd-- }
  return {from: start, to: oldEnd, text: newVal.slice(start, newEnd)}
}

function arrowHandler(dir) {
  return (state, dispatch, view) => {
    if (state.selection.empty && view.endOfTextblock(dir)) {
      let side = dir == "left" || dir == "up" ? -1 : 1, $head = state.selection.$head
      let nextPos = Selection.near(state.doc.resolve(side > 0 ? $head.after() : $head.before()), side)
      if (nextPos.$head && nextPos.$head.parent.type.name == "code_block") {
        dispatch(state.tr.setSelection(nextPos))
        return true
      }
    }
    return false
  }
}

export const arrowHandlers = keymap({
  ArrowLeft: arrowHandler("left"),
  ArrowRight: arrowHandler("right"),
  ArrowUp: arrowHandler("up"),
  ArrowDown: arrowHandler("down")
})
