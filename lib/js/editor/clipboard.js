import { Plugin } from "prosemirror-state"
import { schema } from "./schema"

// not perfect but simple
const urlRegex = /^https?:\/\/\p{ASCII}+$/u

export function clipboard() {
  return new Plugin({
    props: {
      handlePaste(view, event, slice) {
        let text = event.clipboardData.getData('text')
        if (urlRegex.test(text)) {
          view.dispatch(
            view.state.tr.replaceSelectionWith(schema.text(text, [schema.marks.link.create({ href: text })]), false)
          )

          return true
        }

        return false
      }
    }
  })
}
