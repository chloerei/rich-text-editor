import { Schema } from "prosemirror-model"

const schema = new Schema({
  nodes: {
    doc: {
      content: "block+"
    },

    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [ {tag: "p"} ],
      toDOM() { return ["p", 0] }
    },

    blockquote: {
      content: "block+",
      group: "block",
      defining: true,
      parseDOM: [ { tag: "blockquote" } ],
      toDOM() { return ["blockquote", 0] }
    },

    horizontal_rule: {
      group: "block",
      parseDOM: [ { tag: "hr" } ],
      toDOM() { return ["hr"] }
    },

    heading: {
      attrs: { level: { default: 1 } },
      content: "inline*",
      group: "block",
      defining: true,
      parseDOM: [
        { tag: "h1", attrs: { level: 1 } },
        { tag: "h2", attrs: { level: 2 } },
        { tag: "h3", attrs: { level: 3 } },
        { tag: "h4", attrs: { level: 4 } },
        { tag: "h5", attrs: { level: 5 } },
        { tag: "h6", attrs: { level: 6 } }
      ],
      toDOM(node) { return ["h" + node.attrs.level, 0] }
    },

    code_block: {
      attrs: {
        lang: { default: null }
      },
      content: "text*",
      marks: "",
      group: "block",
      code: true,
      defining: true,
      parseDOM: [ { tag: "pre", preserveWhitespace: "full" } ],
      toDOM() { return [ "pre", [ "code", 0 ] ] }
    },

    text: {
      group: "inline"
    },

    image: {
      inline: true,
      attrs: {
        src: { default: null },
        alt: { default: null },
        title: { default: null }
      },
      group: "inline",
      draggable: true,
      parseDOM: [{
        tag: "img[src]", getAttrs(dom) {
          return {
            src: dom.getAttribute("src"),
            title: dom.getAttribute("title"),
            alt: dom.getAttribute("alt")
          }
        }
      }],
      toDOM(node) { let {src, alt, title} = node.attrs; return ["img", {src, alt, title}] }
    },

    figure: {
      content: "text*",
      group: "block",
      attrs: {
        image: { default: null }
      },
      isolating: true,
      parseDOM: [{
        tag: "figure",
        contentElement: 'figcaption',
        getAttrs(dom) {
          let image = dom.querySelector('img')

          return { image: (image ? { src: image.src } : null) }
        }
      }],
      toDOM(node) {
        return ["figure", ["img", node.attrs.image], ["figcaption", 0]]
      }
    },

    hard_break: {
      inline: true,
      group: "inline",
      selectable: false,
      parseDOM: [ { tag: "br" } ],
      toDOM() { return ["br"] }
    },

    ordered_list: {
      content: "list_item+",
      group: "block",
      attrs: { order: { default: 1 } },
      parseDOM: [{
        tag: "ol", getAttrs(dom) {
        return {
          order: dom.hasAttribute("start") ? +dom.getAttribute("start") : 1 }
        }
      }],
      toDOM(node) {
        return node.attrs.order == 1 ? ["ol", 0] : ["ol", { start: node.attrs.order }, 0]
      }
    },

    bulleted_list: {
      content: "list_item+",
      group: "block",
      parseDOM: [ {tag: "ul"} ],
      toDOM() { return ["ul", 0] }
    },

    list_item: {
      content: "paragraph block*",
      parseDOM: [{tag: "li"}],
      toDOM() { return ["li", 0] },
      defining: true
    },

    table: {
      content: "table_row+",
      tableRole: "table",
      isolating: true,
      group: "block",
      parseDOM: [{tag: "table"}],
      toDOM() { return ["table", ["tbody", 0]] }
    },
    table_row: {
      content: "(table_cell | table_header)+",
      tableRole: "row",
      parseDOM: [{tag: "tr"}],
      toDOM() { return ["tr", 0] }
    },
    table_cell: {
      content: "block+",
      attrs: {
        colspan: {default: 1},
        rowspan: {default: 1},
        colwidth: {default: null}
      },
      tableRole: "cell",
      isolating: true,
      parseDOM: [{tag: "td", getAttrs: dom => getCellAttrs(dom, {})}],
      toDOM(node) { return ["td", setCellAttrs(node, {}), 0] }
    },
    table_header: {
      content: "block+",
      attrs: {
        colspan: {default: 1},
        rowspan: {default: 1},
        colwidth: {default: null}
      },
      tableRole: "header_cell",
      isolating: true,
      parseDOM: [{tag: "th", getAttrs: dom => getCellAttrs(dom, {})}],
      toDOM(node) { return ["th", setCellAttrs(node, {}), 0] }
    }
  },

  marks: {
    link: {
      attrs: {
        href: { default: null },
        title: { default: null }
      },
      inclusive: false,
      parseDOM: [{
        tag: "a",
        getAttrs(dom) {
          return { href: dom.getAttribute("href"), title: dom.getAttribute("title") }
        }
      }],
      toDOM(node) {
        let { href, title } = node.attrs;
        return ["a", { href, title }, 0]
      }
    },

    italic: {
      parseDOM: [
        { tag: "i" },
        { tag: "em" },
        { style: "font-style=italic" }
      ],
      toDOM() { return ["em", 0] }
    },

    bold: {
      parseDOM: [
        { tag: "strong" },
        // This works around a Google Docs misbehavior where
        // pasted content will be inexplicably wrapped in `<b>`
        // tags with a font-weight normal.
        { tag: "b", getAttrs: node => node.style.fontWeight != "normal" && null },
        { style: "font-weight", getAttrs: value => /^(bold(er)?|[5-9]\d{2,})$/.test(value) && null }
      ],
      toDOM() { return ["strong", 0] }
    },

    code: {
      parseDOM: [ { tag: "code"} ],
      toDOM() { return ["code", 0] }
    }
  }
})

export { schema }
