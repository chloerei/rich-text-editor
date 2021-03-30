import { Plugin } from "prosemirror-state"
import { TextSelection } from "prosemirror-state"
import { Decoration, DecorationSet } from "prosemirror-view"
import { schema } from './schema'

function addBlockType(nodeType, attrs) {
  return function(state, dispatch) {
    let { $cursor } = state.selection

    if (!$cursor) {
      return false
    }

    if (dispatch) {
      let pos = $cursor.after()
      let tr = state.tr
      tr.replaceWith($cursor.before(), $cursor.after(), nodeType.createAndFill(attrs))
      dispatch(
          tr.setSelection(TextSelection.near(tr.doc.resolve($cursor.start())))
      )
    }

    return true
  }
}

class BlockMenuItem {
  // options:
  //   - icon:: svg
  //   - label:: display label
  //   - description:: description text
  //   - command:: function(state, dispatch)
  constructor(options) {
    this.options = options
  }

  render(editorView) {
    this.editorView = editorView
    this.dom = document.createElement('button')
    this.dom.type = 'button'
    this.dom.className = 'editor-list__item'
    this.dom.innerHTML = `
      <div class="editor-list__item__thumb">
        <div class="editor__icon-thumb">
          ${this.options.icon}
        </div>
      </div>
      <div class="editor-list__item__content">
        <div class="editor-list__item__primary-text">
          ${this.options.label}
        </div>
        <div class="editor-list__item__secondary-text">
          ${this.options.description}
        </div>
      </div>
    `
    this.dom.addEventListener('click', this.execute.bind(this))
  }

  execute() {
    this.options.command(this.editorView.state, this.editorView.dispatch)
    this.editorView.focus()
  }

  match(query) {
    let fuzzyRegexp = new RegExp('.*' + query.split('').join('.*') + '.*', 'i')
    return fuzzyRegexp.test(this.options.label) || fuzzyRegexp.test(this.options.description)
  }
}

class BlockMenuGroup {
  // options:
  //   - label:: display label
  //   - items:: [BlockMenuItem]
  constructor(options) {
    this.options = options
  }

  render(editorView) {
    this.dom = document.createElement('div')
    this.dom.className = 'editor-list'
    this.labelDom = document.createElement('div')
    this.labelDom.className = 'editor-subheader'
    this.labelDom.textContent = this.options.label

    this.options.items.forEach((item) => {
      item.render(editorView)
    })
  }

  update(query) {
    if (query) {
      this.items = this.options.items.filter((item) => {
        return item.match(query)
      })
    } else {
      this.items = this.options.items
    }

    this.dom.innerHTML = ''
    this.items.forEach((item) => {
      this.dom.appendChild(item.dom)
    })
  }
}

function defaultBlockMenuContent() {
  return [
    new BlockMenuGroup({
      label: 'Basic',
      items: [
        new BlockMenuItem({
          label: 'Heading 1',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h1" viewBox="0 0 16 16"> <path d="M8.637 13V3.669H7.379V7.62H2.758V3.67H1.5V13h1.258V8.728h4.62V13h1.259zm5.329 0V3.669h-1.244L10.5 5.316v1.265l2.16-1.565h.062V13h1.244z"/></svg>',
          description: 'Big section heading',
          command: addBlockType(schema.nodes.heading, { level: 1 })
        }),
        new BlockMenuItem({
          label: 'Heading 2',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h2" viewBox="0 0 16 16"> <path d="M7.638 13V3.669H6.38V7.62H1.759V3.67H.5V13h1.258V8.728h4.62V13h1.259zm3.022-6.733v-.048c0-.889.63-1.668 1.716-1.668.957 0 1.675.608 1.675 1.572 0 .855-.554 1.504-1.067 2.085l-3.513 3.999V13H15.5v-1.094h-4.245v-.075l2.481-2.844c.875-.998 1.586-1.784 1.586-2.953 0-1.463-1.155-2.556-2.919-2.556-1.941 0-2.966 1.326-2.966 2.74v.049h1.223z"/> </svg>',
          description: 'Medium section heading',
          command: addBlockType(schema.nodes.heading, { level: 2 })
        }),
        new BlockMenuItem({
          label: 'Heading 3',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-type-h3" viewBox="0 0 16 16"> <path d="M7.637 13V3.669H6.379V7.62H1.758V3.67H.5V13h1.258V8.728h4.62V13h1.259zm3.625-4.272h1.018c1.142 0 1.935.67 1.949 1.674.013 1.005-.78 1.737-2.01 1.73-1.08-.007-1.853-.588-1.935-1.32H9.108c.069 1.327 1.224 2.386 3.083 2.386 1.935 0 3.343-1.155 3.309-2.789-.027-1.51-1.251-2.16-2.037-2.249v-.068c.704-.123 1.764-.91 1.723-2.229-.035-1.353-1.176-2.4-2.954-2.385-1.873.006-2.857 1.162-2.898 2.358h1.196c.062-.69.711-1.299 1.696-1.299.998 0 1.695.622 1.695 1.525.007.922-.718 1.592-1.695 1.592h-.964v1.074z"/> </svg>',
          description: 'Small section heading',
          command: addBlockType(schema.nodes.heading, { level: 3 })
        }),
        new BlockMenuItem({
          label: 'Blockquote',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"/></g><g><g><g><path d="M8.17,17L8.17,17c0.51,0,0.98-0.29,1.2-0.74l1.42-2.84c0.14-0.28,0.21-0.58,0.21-0.89V8c0-1.1-0.9-2-2-2H5.34 C4.6,6,4,6.6,4,7.34v4.32C4,12.4,4.6,13,5.34,13H8l-1.03,2.06C6.52,15.95,7.17,17,8.17,17z M17.17,17L17.17,17 c0.51,0,0.98-0.29,1.2-0.74l1.42-2.84c0.14-0.28,0.21-0.58,0.21-0.89V7.34C20,6.6,19.4,6,18.66,6h-4.32C13.6,6,13,6.6,13,7.34 v4.32C13,12.4,13.6,13,14.34,13H17l-1.03,2.06C15.52,15.95,16.17,17,17.17,17z"/></g></g></g></svg>',
          description: 'Quote content',
          command: addBlockType(schema.nodes.blockquote)
        }),
        new BlockMenuItem({
          label: 'Code',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><path d="M0,0h24v24H0V0z" fill="none"/></g><g><path d="M8.7,15.9L4.8,12l3.9-3.9c0.39-0.39,0.39-1.01,0-1.4s-1.01-0.39-1.4,0l-4.59,4.59c-0.39,0.39-0.39,1.02,0,1.41l4.59,4.6 c0.39,0.39,1.01,0.39,1.4,0S9.09,16.29,8.7,15.9z M15.3,15.9l3.9-3.9l-3.9-3.9c-0.39-0.39-0.39-1.01,0-1.4s1.01-0.39,1.4,0 l4.59,4.59c0.39,0.39,0.39,1.02,0,1.41l-4.59,4.6c-0.39,0.39-1.01,0.39-1.4,0C14.91,16.91,14.91,16.29,15.3,15.9z"/></g></svg>',
          description: 'Source code snipper',
          command: addBlockType(schema.nodes.code_block)
        }),
        new BlockMenuItem({
          label: 'Image',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" height="24" width="24"/></g><g><path d="M19,3H5C3.9,3,3,3.9,3,5v14c0,1.1,0.9,2,2,2h14c1.1,0,2-0.9,2-2V5C21,3.9,20.1,3,19,3z M6.6,16.2l2-2.67 c0.2-0.27,0.6-0.27,0.8,0L11.25,16l2.6-3.47c0.2-0.27,0.6-0.27,0.8,0l2.75,3.67c0.25,0.33,0.01,0.8-0.4,0.8H7 C6.59,17,6.35,16.53,6.6,16.2z"/></g></svg>',
          description: 'Image with caption',
          command: addBlockType(schema.nodes.figure)
        }),
        new BlockMenuItem({
          label: 'Divider',
          icon: '<svg xmlns="http://www.w3.org/2000/svg" enable-background="new 0 0 24 24" height="24" viewBox="0 0 24 24" width="24"><g><rect fill="none" fill-rule="evenodd" height="24" width="24"/><g><path d="M19,13H5c-0.55,0-1-0.45-1-1v0c0-0.55,0.45-1,1-1h14c0.55,0,1,0.45,1,1v0 C20,12.55,19.55,13,19,13z" fill-rule="evenodd"/></g></g></svg>',
          description: 'Horizontal rule',
          command: addBlockType(schema.nodes.horizontal_rule)
        })
      ]
    })
  ]
}

class BlockMenuView {
  constructor(options) {
    this.options = options
    this.content = options.content || defaultBlockMenuContent()
    this.ignored = DecorationSet.empty
  }

  handleView(editorView) {
    this.editorView = editorView

    this.dom = document.createElement('div')
    this.dom.className = 'editor-dropdown'

    this.content.forEach((group) => {
      group.render(editorView)
    })

    this.editorView.dom.parentNode.appendChild(this.dom)

    return {
      update: this.update.bind(this),
      destroy: this.destroy.bind(this)
    }
  }

  update(view) {
    // findMatch is excute in state apply for decorations
    if (this.match) {
      this.showMenu()
    } else {
      this.hideMenu()
    }
  }

  findMatch(state) {
    let { $cursor } = state.selection

    if (!$cursor || $cursor.depth != 1 || $cursor.parent.type.name != 'paragraph') {
      return null
    }

    if (this.ignored.find($cursor.start(), $cursor.end()).length) {
      return null
    }

    let text = $cursor.doc.textBetween($cursor.start(), $cursor.end())
    let match = /^\/(\w*)$/.exec(text)
    if (match) {
      return {
        query: match[1],
        text: text,
        from: $cursor.start(),
        to: $cursor.end()
      }
    } else {
      return null
    }
  }

  showMenu() {
    this.updateMenuContent()
    this.updateMenuPosition()
    this.selectFirst()
    this.active = true
  }

  updateMenuContent() {
    if (this.query != this.match.query) {
      this.query = this.match.query
      this.unselect()

      this.dom.innerHTML = ''
      this.items = []

      this.content.forEach((group) => {
        group.update(this.query)

        if (group.items.length > 0) {
          this.dom.appendChild(group.labelDom)
          this.dom.appendChild(group.dom)
          // cache for navigator
          this.items = this.items.concat(group.items)
        }
      })
    }
  }

  updateMenuPosition() {
    this.dom.classList.add('editor-dropdown--open')

    let coords = this.editorView.coordsAtPos(this.editorView.state.selection.$cursor.start())
    let box = this.editorView.dom.offsetParent.getBoundingClientRect()

    this.dom.style.top = (coords.bottom - box.top) + 'px'
    this.dom.style.left = (coords.left - box.left) + 'px'
  }

  hideMenu() {
    if (this.active) {
      this.match = null
      this.query = null
      this.dom.innerHTML = ''
      this.dom.classList.remove('editor-dropdown--open')
      this.active = false
    }
  }

  destroy() {
    this.dom.remove()
  }

  handleKeyDown(view, event) {
    if (this.active) {
      switch (event.keyCode) {
        case 38: // ArrowUp
          this.selectPrev()
          return true
        case 40: // ArrowDown
          this.selectNext()
          return true
        case 13: // Enter
          this.executeSeleted()
          return true
        case 27: // Esc
          this.esc()
          return true
      }
    }
  }

  selectFirst() {
    if (this.items.length) {
      this.selectIndex(0)
    }
  }

  selectLast() {
    if (this.items.length) {
      this.selectIndex(this.items.length - 1)
    }
  }

  selectNext() {
    if (this.items.length) {
      if (this.selectedIndex < this.items.length - 1) {
        this.selectIndex(this.selectedIndex + 1)
      } else {
        this.selectFirst()
      }
    }
  }

  selectPrev() {
    if (this.items.length) {
      if (this.selectedIndex > 0) {
        this.selectIndex(this.selectedIndex - 1)
      } else {
        this.selectLast()
      }
    }
  }

  selectIndex(index) {
    this.unselect()
    this.selectedIndex = index
    this.selectedItem = this.items[index]

    this.selectedItem.dom.classList.add('editor-list__item--active')
    if (this.dom.scrollTop + this.dom.offsetHeight < this.selectedItem.dom.offsetTop + this.selectedItem.dom.offsetHeight) {
      // scroll down
      this.dom.scrollTop = this.selectedItem.dom.offsetTop + this.selectedItem.dom.offsetHeight - this.dom.offsetHeight
    } else if (this.dom.scrollTop > this.selectedItem.dom.offsetTop) {
      // scroll up
      this.dom.scrollTop = this.selectedItem.dom.offsetTop
    }
  }

  unselect() {
    if (this.selectedItem) {
      this.selectedIndex = null
      this.selectedItem.dom.classList.remove('editor-list__item--active')
    }
  }

  executeSeleted() {
    if (this.selectedItem) {
      this.selectedItem.execute()
    }
  }

  esc() {
    if (this.match) {
      this.ignored = this.ignored.add(this.editorView.state.doc, [Decoration.inline(this.match.from, this.match.to, { class: 'editor-block-menu__ignored' })])
      // trigger view update
      let tr = this.editorView.state.tr.insertText(this.match.text, this.match.from, this.match.to)
      this.editorView.dispatch(tr)
    }
  }

  apply(transaction, state) {
    this.ignored = this.ignored.map(transaction.mapping, state.doc)
    this.match = this.findMatch(state)
  }

  decorations(state) {
    if (this.match) {
      return this.ignored.add(state.doc, [
        Decoration.inline(this.match.from, this.match.to, { class: "editor-block-menu__match" })
      ])
    } else {
      return this.ignored
    }
  }
}

export function blockMenu(options = {}) {
  let blockMenuView = new BlockMenuView(options)
  let plugin = new Plugin({
    state: {
       init() {
       },
       apply(transaction, _, oldState, newState) {
         blockMenuView.apply(transaction, newState)
       }
    },
    props: {
      handleKeyDown(view, event) {
        return blockMenuView.handleKeyDown(view, event)
      },
      decorations(state) {
        return blockMenuView.decorations(state)
      }
    },
    view(editorView) {
      return blockMenuView.handleView(editorView)
    }
  })

  return plugin
}
