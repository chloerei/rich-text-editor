import { schema } from "./schema"

import {EditorState as CMEditorState, EditorView as CMEditorView, basicSetup} from "@codemirror/basic-setup"
import {javascript} from "@codemirror/lang-javascript"

export class CodeBlockView {
  constructor(node, view, getPos) {
    this.node = node
    this.view = view

    this.dom = document.createElement('div')
    this.dom.className = 'editor__code-block'

    this.cm = new CMEditorView({
      state: CMEditorState.create({
        doc: node.textContent,
        extensions: [basicSetup, javascript()]
      }),
      parent: this.dom
    })
  }

  setSelection(anchor, head) {
    this.cm.focus()
    this.cm.state.update(
      { selection: { from: anchor, to: head } }
    )
  }

  stopEvent() {
    return true
  }
}
