import { DOMParser, DOMSerializer } from "prosemirror-model"
import { EditorState } from "prosemirror-state"
import { EditorView } from "prosemirror-view"
import { history } from "prosemirror-history"
import { keymap } from "prosemirror-keymap"
import { schema } from './editor/schema'
import { baseInputRules } from './editor/input_rules'
import { HeadingView } from './editor/node_views'
import { FigureView } from './editor/figure'
// import { CodeBlockView, arrowHandlers } from './editor/code_block'
import { baseKeymap } from "./editor/commands"
import { blockMenu } from "./editor/block_menu"
import { inlineMenu } from "./editor/inline_menu"
import { linkMenu } from "./editor/link_menu"
import { clipboard } from "./editor/clipboard"

export class Editor {
  constructor(element, options = {}) {
    this.element = element
    this.options = options

    let contentElement = document.createElement('div')
    contentElement.innerHTML = this.options.input ? this.options.input.value : this.element.innerHTML
    this.element.innerHTML = ''

    let state = EditorState.create({
      schema,
      doc: DOMParser.fromSchema(schema).parse(contentElement),
      plugins: [
        history(),
        blockMenu(),
        inlineMenu(),
        linkMenu(),
        clipboard(),
        // arrowHandlers,
        keymap(baseKeymap),
        baseInputRules
      ]
    })

    this.editorView = new EditorView(this.element, {
      state,
      nodeViews: {
        heading(node) { return new HeadingView(node) },
        figure(node, view, getPos) { return new FigureView(node, view, getPos, options) },
        // code_block(node, view, getPos) { return new CodeBlockView(node, view, getPos) }
      },
      dispatchTransaction: (transaction) => {
        this.editorView.updateState(this.editorView.state.apply(transaction))

        // update input
        if (transaction.docChanged) {
          if (this.options.input) {
            this.options.input.value = this.getContent()
            this.options.input.dispatchEvent(new Event('input', { bubbles: true }))
          }
        }
      }
    })

    this.editorView.dom.classList.add('editor')
  }

  getContent() {
    let fragment = DOMSerializer.fromSchema(schema).serializeFragment(this.editorView.state.doc.content)
    let tmpElement = document.createElement('div')
    tmpElement.appendChild(fragment)
    return tmpElement.innerHTML
  }
}
