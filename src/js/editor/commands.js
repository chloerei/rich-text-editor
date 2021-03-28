import { chainCommands, deleteSelection, selectNodeBackward, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock, exitCode, selectNodeForward, selectAll, joinBackward, joinForward } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { setBlockType } from "prosemirror-commands"
import { Selection, NodeSelection } from "prosemirror-state"
import { Slice, Fragment } from "prosemirror-model"
import {joinPoint, canJoin, findWrapping, liftTarget, canSplit, ReplaceAroundStep, ReplaceStep} from "prosemirror-transform"
import { splitListItem, liftListItem, sinkListItem, joinListForward, joinListBackward } from "./list"
import { schema } from "./schema"

function setParagraph(state, dispatch) {
  let { $cursor } = state.selection
  if (!$cursor || $cursor.parent.type.name == 'paragraph' || $cursor.parent.content.size) {
    return false
  }

  if (dispatch) {
    dispatch(state.tr.setBlockType($cursor.before(), $cursor.after(), schema.nodes.paragraph))
  }
  return true
}

function defaultBlockAt(match) {
  for (let i = 0; i < match.edgeCount; i++) {
    let {type} = match.edge(i)
    if (type.isTextblock && !type.hasRequiredAttrs()) return type
  }
  return null
}

function createBlockAfterIsolating(state, dispatch) {
  let {$head, $anchor} = state.selection

  if (!$head.parent.type.spec.isolating || !$head.sameParent($anchor)) {
    return false
  }

  let above = $head.node(-1)
  let after = $head.indexAfter(-1)
  let type = defaultBlockAt(above.contentMatchAt(after))

  if (!above.canReplaceWith(after, after, type)) {
    return false
  }

  if (dispatch) {
    let pos = $head.after(), tr = state.tr.replaceWith(pos, pos, type.createAndFill())
    tr.setSelection(Selection.near(tr.doc.resolve(pos), 1))
    dispatch(tr.scrollIntoView())
  }
  return true
}

let backspace = chainCommands(deleteSelection, setParagraph, joinListBackward, joinBackward, selectNodeBackward)

let enter = chainCommands(newlineInCode, splitListItem, createParagraphNear, liftEmptyBlock, createBlockAfterIsolating, splitBlock)

let del = chainCommands(deleteSelection, joinListForward, joinForward, selectNodeForward)

let tab = chainCommands(sinkListItem)

let shiftTab = chainCommands(liftListItem)

export let pcBaseKeymap = {
  "Enter": enter,
  "Backspace": backspace,
  "Mod-Backspace": backspace,
  "Delete": del,
  "Mod-Delete": del,
  "Mod-a": selectAll,
  "Mod-z": undo,
  "Mod-y": redo,
  "Tab": tab,
  "Shift-Tab": shiftTab
}

export let macBaseKeymap = {
  "Ctrl-h": pcBaseKeymap["Backspace"],
  "Alt-Backspace": pcBaseKeymap["Mod-Backspace"],
  "Ctrl-d": pcBaseKeymap["Delete"],
  "Ctrl-Alt-Backspace": pcBaseKeymap["Mod-Delete"],
  "Alt-Delete": pcBaseKeymap["Mod-Delete"],
  "Alt-d": pcBaseKeymap["Mod-Delete"]
}
for (let key in pcBaseKeymap) macBaseKeymap[key] = pcBaseKeymap[key]

const mac = typeof navigator != "undefined" ? /Mac/.test(navigator.platform)
          : typeof os != "undefined" ? os.platform() == "darwin" : false

export let baseKeymap = mac ? macBaseKeymap : pcBaseKeymap
