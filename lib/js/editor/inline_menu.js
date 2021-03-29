import { Plugin } from "prosemirror-state"
import { toggleMark } from "prosemirror-commands"
import { schema } from "./schema"
import { linkMenuPluginKey } from './link_menu'

class InlineMenuItemView {
  // options:
  //   - icon
  //   - title
  //   - command(state, dispatch)
  constructor(options) {
    this.options = options
  }

  render(editorView) {
    let dom = document.createElement('button')
    dom.type = 'button'
    dom.className = 'editor-inline-menu__item'
    dom.innerHTML = this.options.icon
    dom.setAttribute('title', this.options.title)

    dom.addEventListener('click', () => {
      editorView.focus()
      this.options.command(editorView.state, editorView.dispatch)
    })

    let update = (view, prevState) => {
      if (this.options.active) {
        let active = this.options.active(view.state)
        dom.classList.toggle('editor-inline-menu__item--active', active)
      }
    }

    return { dom, update }
  }
}

function activeMark(type) {
  return function(state) {
    let { from, $from, to, empty } = state.selection
    if (empty) {
      return !!type.isInSet(state.storedMarks || $from.marks())
    } else {
      return state.doc.rangeHasMark(from, to, type)
    }
  }
}

const toggleLinkCommand = toggleMark(schema.marks.link)

function toggleLink(state, dispatch) {
  let { from, to } = state.selection

  if (state.doc.rangeHasMark(from, to, schema.marks.link)) {
    toggleLinkCommand(state, dispatch)
  } else {
    // delegate link menu to show form
    dispatch(
      state.tr.setMeta(linkMenuPluginKey, { add: { from, to } })
    )
  }
}

export const defaultInlineMenuItems = [
  new InlineMenuItemView({
    icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15.6 10.79c.97-.67 1.65-1.77 1.65-2.79 0-2.26-1.75-4-4-4H8c-.55 0-1 .45-1 1v12c0 .55.45 1 1 1h5.78c2.07 0 3.96-1.69 3.97-3.77.01-1.53-.85-2.84-2.15-3.44zM10 6.5h3c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5h-3v-3zm3.5 9H10v-3h3.5c.83 0 1.5.67 1.5 1.5s-.67 1.5-1.5 1.5z"/></svg>',
    title: 'Bold',
    command: toggleMark(schema.marks.bold),
    active: activeMark(schema.marks.bold)
  }),
  new InlineMenuItemView({
    icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 5.5c0 .83.67 1.5 1.5 1.5h.71l-3.42 8H7.5c-.83 0-1.5.67-1.5 1.5S6.67 18 7.5 18h5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5h-.71l3.42-8h1.29c.83 0 1.5-.67 1.5-1.5S17.33 4 16.5 4h-5c-.83 0-1.5.67-1.5 1.5z"/></svg>',
    title: 'Italic',
    command: toggleMark(schema.marks.italic),
    active: activeMark(schema.marks.italic)
  }),
  new InlineMenuItemView({
    icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M8.7 15.9L4.8 12l3.9-3.9c.39-.39.39-1.01 0-1.4-.39-.39-1.01-.39-1.4 0l-4.59 4.59c-.39.39-.39 1.02 0 1.41l4.59 4.6c.39.39 1.01.39 1.4 0 .39-.39.39-1.01 0-1.4zm6.6 0l3.9-3.9-3.9-3.9c-.39-.39-.39-1.01 0-1.4.39-.39 1.01-.39 1.4 0l4.59 4.59c.39.39.39 1.02 0 1.41l-4.59 4.6c-.39.39-1.01.39-1.4 0-.39-.39-.39-1.01 0-1.4z"/></svg>',
    title: 'Code',
    command: toggleMark(schema.marks.code),
    active: activeMark(schema.marks.code)
  }),
  new InlineMenuItemView({
    icon: '<svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3.96 11.38C4.24 9.91 5.62 8.9 7.12 8.9h2.93c.52 0 .95-.43.95-.95S10.57 7 10.05 7H7.22c-2.61 0-4.94 1.91-5.19 4.51C1.74 14.49 4.08 17 7 17h3.05c.52 0 .95-.43.95-.95s-.43-.95-.95-.95H7c-1.91 0-3.42-1.74-3.04-3.72zM9 13h6c.55 0 1-.45 1-1s-.45-1-1-1H9c-.55 0-1 .45-1 1s.45 1 1 1zm7.78-6h-2.83c-.52 0-.95.43-.95.95s.43.95.95.95h2.93c1.5 0 2.88 1.01 3.16 2.48.38 1.98-1.13 3.72-3.04 3.72h-3.05c-.52 0-.95.43-.95.95s.43.95.95.95H17c2.92 0 5.26-2.51 4.98-5.49-.25-2.6-2.59-4.51-5.2-4.51z"/></svg>',
    title: 'Link',
    command: toggleLink,
    active: activeMark(schema.marks.link)
  }),
]

class InlineMenuView {
  constructor(editorView, options = {}) {
    this.editorView = editorView
    this.opitons = options

    this.dom = document.createElement('div')
    this.dom.className = 'editor-inline-menu'
    this.editorView.dom.parentNode.appendChild(this.dom)

    this.items = (options.items || defaultInlineMenuItems).map((item) => {
      return item.render(this.editorView)
    })

    this.items.forEach((item) => {
      this.dom.appendChild(item.dom)
    })

    this.arrowDom = document.createElement('div')
    this.arrowDom.className = 'editor-inline-menu__arrow'
    this.dom.appendChild(this.arrowDom)
  }

  update(view, prevState) {
    let { empty, node, from, to } = view.state.selection

    if (!empty && !node) {
      this.dom.classList.add('editor-inline-menu--open')
      let start = view.coordsAtPos(from)
      let end = view.coordsAtPos(to)
      let box = this.dom.offsetParent.getBoundingClientRect()
      let center = Math.max((start.left + end.left) / 2, start.left + 12)

      let menuBox = this.dom.getBoundingClientRect()

      if (center - (menuBox.width / 2) < box.left) {
        this.dom.style.left = '0px'
        this.arrowDom.style.left = center - box.left + 'px'
      } else if (center + (menuBox.width / 2) > (box.left + box.width)) {
        this.dom.style.left = box.width - menuBox.width + 'px'
        this.arrowDom.style.left = center - box.left - box.width + menuBox.width + 'px'
      } else {
        this.dom.style.left = center - (menuBox.width / 2) - box.left + 'px'
        this.arrowDom.style.left = '50%'
      }

      this.dom.style.bottom = (box.bottom - start.top + 8) + 'px'

      this.items.forEach((item) => {
        item.update(view, prevState)
      })
    } else {
      this.dom.classList.remove('editor-inline-menu--open')
    }
  }

  destroy() {
    this.dom.remove()
  }
}

export function inlineMenu(options) {
  let plugin = new Plugin({
    view(editorView) {
      return new InlineMenuView(editorView, options)
    }
  })

  return plugin
}
