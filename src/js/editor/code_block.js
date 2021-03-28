import { schema } from "./schema"
import { TextSelection } from "prosemirror-state"
import { exitCode } from "prosemirror-commands"

import { EditorState, EditorView, basicSetup} from "@codemirror/basic-setup"
import { Transaction } from "@codemirror/state"
import { keymap } from "@codemirror/view"
import { indentMore, indentSelection } from "@codemirror/commands"
import { getIndentUnit, indentString } from "@codemirror/language"
import { javascript } from "@codemirror/lang-javascript"

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


export class CodeBlockView {
  constructor(node, view, getPos) {
    this.node = node
    this.view = view
    this.getPos = getPos

    this.dom = document.createElement('div')
    this.dom.className = 'editor__code-block'

    this.cm = new EditorView({
      state: EditorState.create({
        doc: node.textContent,
        extensions: [
          basicSetup,
          javascript(),
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
      }),
      parent: this.dom,
      // dispatch: (tr) => {
      //   this.cm.update([tr])
      //   console.log(this.cm.state.doc.toString())
      // }
    })
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

    return true
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
