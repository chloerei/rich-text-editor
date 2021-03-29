export class HeadingView {
  constructor(node) {
    this.dom = this.contentDOM = document.createElement("h" + node.attrs.level)

    if (node.content.size == 0) {
      this.dom.dataset.placeholder = 'Header ' + node.attrs.level
    }
  }

  update(node) {
    if (node.type.name != "heading") {
      return false
    }

    if (node.content.size > 0) {
      delete this.dom.dataset.placeholder
    } else {
      this.dom.dataset.placeholder = 'Header ' + node.attrs.level
    }

    return true
  }
}
