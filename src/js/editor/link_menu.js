import { Plugin, PluginKey } from "prosemirror-state"
import { schema } from "./schema"

class LinkMenuView {
  constructor(editorView) {
    this.editorView = editorView

    this.dom = document.createElement('div')
    this.dom.className = 'editor-dropdown editor-link-menu'
    this.dom.innerHTML = `
      <div class="editor-toolbar editor-link-menu__toolbar">
        <div class="editor-toolbar__action">
          <button type="button" class="editor-button editor-button--icon editor-button--readonly">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 17.93c-3.95-.49-7-3.85-7-7.93 0-.62.08-1.21.21-1.79L9 15v1c0 1.1.9 2 2 2v1.93zm6.9-2.54c-.26-.81-1-1.39-1.9-1.39h-1v-3c0-.55-.45-1-1-1H8v-2h2c.55 0 1-.45 1-1V7h2c1.1 0 2-.9 2-2v-.41c2.93 1.19 5 4.06 5 7.41 0 2.08-.8 3.97-2.1 5.39z"/></svg>
          </button>
        </div>
        <div class="editor-toolbar__title">
          <a target="_blank" data-target="link">
          </a>
        </div>
        <div class="editor-toolbar__action">
          <button type="button" class="editor-button editor-button--icon" data-action="copy">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M15 1H4c-1.1 0-2 .9-2 2v13c0 .55.45 1 1 1s1-.45 1-1V4c0-.55.45-1 1-1h10c.55 0 1-.45 1-1s-.45-1-1-1zm4 4H8c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h11c1.1 0 2-.9 2-2V7c0-1.1-.9-2-2-2zm-1 16H9c-.55 0-1-.45-1-1V8c0-.55.45-1 1-1h9c.55 0 1 .45 1 1v12c0 .55-.45 1-1 1z"/></svg>
          </button>
        </div>
        <div class="editor-toolbar__action" data-action="edit">
          <button type="button" class="editor-button editor-button--icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M3 17.46v3.04c0 .28.22.5.5.5h3.04c.13 0 .26-.05.35-.15L17.81 9.94l-3.75-3.75L3.15 17.1c-.1.1-.15.22-.15.36zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
          </button>
        </div>
        <div class="editor-toolbar__action">
          <button type="button" class="editor-button editor-button--icon" data-action="unlink">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M21.94 11.23C21.57 8.76 19.32 7 16.82 7h-2.87c-.52 0-.95.43-.95.95s.43.95.95.95h2.9c1.6 0 3.04 1.14 3.22 2.73.17 1.43-.64 2.69-1.85 3.22l1.4 1.4c1.63-1.02 2.64-2.91 2.32-5.02zM4.12 3.56c-.39-.39-1.02-.39-1.41 0s-.39 1.02 0 1.41l2.4 2.4c-1.94.8-3.27 2.77-3.09 5.04C2.23 15.05 4.59 17 7.23 17h2.82c.52 0 .95-.43.95-.95s-.43-.95-.95-.95H7.16c-1.63 0-3.1-1.19-3.25-2.82-.15-1.72 1.11-3.17 2.75-3.35l2.1 2.1c-.43.09-.76.46-.76.92v.1c0 .52.43.95.95.95h1.78L13 15.27V17h1.73l3.3 3.3c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L4.12 3.56zM16 11.95c0-.52-.43-.95-.95-.95h-.66l1.49 1.49c.07-.13.12-.28.12-.44v-.1z"/></svg>
          </button>
        </div>
      </div>
      <form class="editor-toolbar editor-link-menu__form" data-action="save">
        <input class="editor-text-field" data-target="input" placeholder="Paste or type a link...">
        <div class="editor-toolbar__action">
          <button type="submit" class="editor-button editor-button--icon">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M9 16.17L5.53 12.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41l4.18 4.18c.39.39 1.02.39 1.41 0L20.29 7.71c.39-.39.39-1.02 0-1.41-.39-.39-1.02-.39-1.41 0L9 16.17z"/></svg>
          </button>
        </div>
        <div class="editor-toolbar__action">
          <button type="button" class="editor-button editor-button--icon" data-action="close">
            <svg xmlns="http://www.w3.org/2000/svg" height="24" viewBox="0 0 24 24" width="24"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M18.3 5.71c-.39-.39-1.02-.39-1.41 0L12 10.59 7.11 5.7c-.39-.39-1.02-.39-1.41 0-.39.39-.39 1.02 0 1.41L10.59 12 5.7 16.89c-.39.39-.39 1.02 0 1.41.39.39 1.02.39 1.41 0L12 13.41l4.89 4.89c.39.39 1.02.39 1.41 0 .39-.39.39-1.02 0-1.41L13.41 12l4.89-4.89c.38-.38.38-1.02 0-1.4z"/></svg>
          </button>
        </div>
      </form>
    `
    this.editorView.dom.parentNode.appendChild(this.dom)

    this.linkTarget = this.dom.querySelector('[data-target="link"]')
    this.inputTarget = this.dom.querySelector('[data-target="input"]')

    this.dom.querySelector('[data-action="copy"]').addEventListener('click', this.copy.bind(this))
    this.dom.querySelector('[data-action="edit"]').addEventListener('click', this.edit.bind(this))
    this.dom.querySelector('[data-action="unlink"]').addEventListener('click', this.unlink.bind(this))
    this.dom.querySelector('[data-action="close"]').addEventListener('click', this.close.bind(this))
    this.dom.querySelector('[data-action="save"]').addEventListener('submit', this.save.bind(this))
  }

  update(view, prevState) {
    let state = linkMenuPluginKey.getState(view.state)

    this.mark = this.from = this.to = null

    if (state && state.add) {
      // add link
      this.from = state.add.from
      this.to = state.add.to
      this.showMenu()
      return
    }

    let { $from, $to, from, to } = view.state.selection

    if ($from.node().eq($to.node())) {
      let start = $from.start()
      $from.node().forEach((node, offset, index) => {
        let nodeStart = start + offset
        let nodeEnd = start + offset + node.nodeSize
        if (nodeStart < from && nodeEnd > to) {
          let mark = schema.marks.link.isInSet(node.marks)
          if (mark) {
            this.mark = mark
            this.from = nodeStart
            this.to = nodeEnd
          }
        }
      })
    }

    if (this.mark) {
      this.showMenu()
    } else {
      this.hideMenu()
    }
  }

  showMenu() {
    this.dom.classList.add('editor-dropdown--open')

    let start = this.editorView.coordsAtPos(this.from)
    let end = this.editorView.coordsAtPos(this.to)
    let box = this.dom.offsetParent.getBoundingClientRect()
    let center = Math.max((start.left + end.left) / 2, start.left + 8)

    let menuBox = this.dom.getBoundingClientRect()

    if (center - (menuBox.width / 2) < box.left) {
      this.dom.style.left = '0px'
    } else if (center + (menuBox.width / 2) > (box.left + box.width)) {
      this.dom.style.left = box.width - menuBox.width + 'px'
    } else {
      this.dom.style.left = center - (menuBox.width / 2) - box.left + 'px'
    }

    this.dom.style.top = (start.bottom - box.top) + 8 + 'px'

    if (this.mark) {
      this.linkTarget.textContent = this.mark.attrs.href
      this.linkTarget.href = this.mark.attrs.href
      this.inputTarget.value = this.mark.attrs.href
    } else {
      this.linkTarget.textContent = ''
      this.linkTarget.href = ''
      this.inputTarget.value = ''
      this.edit()
    }
  }

  hideMenu() {
    this.dom.classList.remove('editor-dropdown--open')
  }

  copy() {
    navigator.clipboard.writeText(this.mark.attrs.href)
  }

  edit() {
    this.dom.classList.add('editor-link-menu--editing')
    this.inputTarget.focus()
  }

  unlink() {
    this.editorView.dispatch(
      this.editorView.state.tr.removeMark(this.from, this.to, schema.marks.link)
    )
    this.editorView.focus()
  }

  save(event) {
    event.preventDefault()
    this.editorView.dispatch(
      this.editorView.state.tr.addMark(this.from, this.to, schema.marks.link.create({ href: this.inputTarget.value }))
    )

    this.close()
  }

  close() {
    if (this.mark) {
      this.dom.classList.remove('editor-link-menu--editing')
    } else {
      this.hideMenu()
    }
    this.editorView.focus()
  }

  destroy() {
    this.dom.remove()
  }
}

export const linkMenuPluginKey = new PluginKey('link-menu')

export function linkMenu() {
  return new Plugin({
    key: linkMenuPluginKey,
    state: {
      init() { return null },
      apply(tr, value) {
        return tr.getMeta(linkMenuPluginKey)
      }
    },
    view(editorView) {
      return new LinkMenuView(editorView)
    }
  })
}
