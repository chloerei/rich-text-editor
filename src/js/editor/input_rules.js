import { schema } from './schema'
import { inputRules, wrappingInputRule, textblockTypeInputRule, InputRule } from "prosemirror-inputrules"

function markInputRule(regexp, markType, getAttrs) {
  return new InputRule(regexp, (state, match, start, end) => {
    let attrs = getAttrs instanceof Function ? getAttrs(match) : getAttrs
    let tr = state.tr
    if (match[1]) {
      let textStart = start + match[0].indexOf(match[1])
      let textEnd = textStart + match[1].length
      if (textEnd < end) tr.delete(textEnd, end)
      if (textStart > start) tr.delete(start, textStart)
      end = start + match[1].length
    }
    tr.addMark(start, end, markType.create(attrs))
    tr.removeStoredMark(markType) // Do not continue with mark.
    return tr
  })
}

const headingRule = textblockTypeInputRule(/^(#{1,6})\s$/, schema.nodes.heading, (match) => {
  return {
    level: match[1].length
  }
})

const codeBlockRule = textblockTypeInputRule(/^```\s$/, schema.nodes.code_block)

const blockquoteRule = wrappingInputRule(/^>\s$/, schema.nodes.blockquote)

const orderedListRule = wrappingInputRule(/^(\d+)\.\s$/, schema.nodes.ordered_list, (match) => ({ order: +match[1] }), (match, node) => node.childCount + node.attrs.order == +match[1])

const bulletedListRule = wrappingInputRule(/^\s*([-+*])\s$/, schema.nodes.bulleted_list)

const strongRule = markInputRule(/\*\*([^\*]+)\*\*/, schema.marks.bold)
const codeRule = markInputRule(/`([^`]+)`/, schema.marks.code)

const rules = [
  headingRule,
  codeBlockRule,
  blockquoteRule,
  orderedListRule,
  bulletedListRule,
  strongRule,
  codeRule
]

export const baseInputRules = inputRules({ rules })
