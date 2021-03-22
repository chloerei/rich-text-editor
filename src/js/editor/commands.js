import { chainCommands, deleteSelection, selectNodeBackward, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock, exitCode, selectNodeForward, selectAll } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { setBlockType } from "prosemirror-commands"
import { Selection, NodeSelection } from "prosemirror-state"
import { Slice, Fragment } from "prosemirror-model"
import {joinPoint, canJoin, findWrapping, liftTarget, canSplit, ReplaceAroundStep, ReplaceStep} from "prosemirror-transform"
import { splitListItem, liftListItem, sinkListItem } from "prosemirror-schema-list"
import { goToNextCell } from 'prosemirror-tables'
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

function findCutBefore($pos) {
  if (!$pos.parent.type.spec.isolating) for (let i = $pos.depth - 1; i >= 0; i--) {
    if ($pos.index(i) > 0) return $pos.doc.resolve($pos.before(i + 1))
    if ($pos.node(i).type.spec.isolating) break
  }
  return null
}

function findCutAfter($pos) {
  if (!$pos.parent.type.spec.isolating) for (let i = $pos.depth - 1; i >= 0; i--) {
    let parent = $pos.node(i)
    if ($pos.index(i) + 1 < parent.childCount) return $pos.doc.resolve($pos.after(i + 1))
    if (parent.type.spec.isolating) break
  }
  return null
}

function textblockAt(node, side) {
  for (; node; node = (side == "start" ? node.firstChild : node.lastChild))
    if (node.isTextblock) return true
  return false
}

function joinBackward(state, dispatch, view) {
 let {$cursor} = state.selection
 if (!$cursor || (view ? !view.endOfTextblock("backward", state)
                       : $cursor.parentOffset > 0))
   return false
 let $cut = findCutBefore($cursor)
 // If there is no node before this, try to lift
 if (!$cut) {
   let range = $cursor.blockRange(), target = range && liftTarget(range)
   if (target == null) return false
   if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView())
   return true
 }
 let before = $cut.nodeBefore
 // Apply the joining algorithm
 if (!before.type.spec.isolating && deleteBarrier(state, $cut, dispatch))
   return true
 // If the node below has no content and the node above is
 // selectable, delete the node below and select the one above.
 if ($cursor.parent.content.size == 0 &&
     (textblockAt(before, "end") || NodeSelection.isSelectable(before))) {
   if (dispatch) {
     let tr = state.tr.deleteRange($cursor.before(), $cursor.after())
     tr.setSelection(textblockAt(before, "end") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos, -1)), -1)
                     : NodeSelection.create(tr.doc, $cut.pos - before.nodeSize))
     dispatch(tr.scrollIntoView())
   }
   return true
 }
 // If the node before is an atom, delete it
 if (before.isAtom && $cut.depth == $cursor.depth - 1) {
   if (dispatch) dispatch(state.tr.delete($cut.pos - before.nodeSize, $cut.pos).scrollIntoView())
   return true
 }
 return false
}

function joinForward(state, dispatch, view) {
  let {$cursor} = state.selection
  if (!$cursor || (view ? !view.endOfTextblock("forward", state)
                        : $cursor.parentOffset < $cursor.parent.content.size))
    return false

  let $cut = findCutAfter($cursor)

  // If there is no node after this, there's nothing to do
  if (!$cut) return false

  let after = $cut.nodeAfter
  // Try the joining algorithm
  if (deleteBarrier(state, $cut, dispatch)) return true

  // If the node above has no content and the node below is
  // selectable, delete the node above and select the one below.
  if ($cursor.parent.content.size == 0 &&
      (textblockAt(after, "start") || NodeSelection.isSelectable(after))) {
    if (dispatch) {
      let tr = state.tr.deleteRange($cursor.before(), $cursor.after())
      tr.setSelection(textblockAt(after, "start") ? Selection.findFrom(tr.doc.resolve(tr.mapping.map($cut.pos)), 1)
                      : NodeSelection.create(tr.doc, tr.mapping.map($cut.pos)))
      dispatch(tr.scrollIntoView())
    }
    return true
  }

  // If the next node is an atom, delete it
  if (after.isAtom && $cut.depth == $cursor.depth - 1) {
    if (dispatch) dispatch(state.tr.delete($cut.pos, $cut.pos + after.nodeSize).scrollIntoView())
    return true
  }

  return false
}

function joinMaybeClear(state, $pos, dispatch) {
  let before = $pos.nodeBefore, after = $pos.nodeAfter, index = $pos.index()
  if (!before || !after || !before.type.compatibleContent(after.type)) return false
  if (!before.content.size && $pos.parent.canReplace(index - 1, index)) {
    if (dispatch) dispatch(state.tr.delete($pos.pos - before.nodeSize, $pos.pos).scrollIntoView())
    return true
  }
  if (!$pos.parent.canReplace(index, index + 1) || !(after.isTextblock || canJoin(state.doc, $pos.pos)))
    return false
  let depth = 1
  let beforeChild = before
  let afterChild = after
  while (beforeChild && afterChild && !beforeChild.isTextblock && !afterChild.isTextblock) {
    beforeChild = beforeChild.lastChild
    afterChild = afterChild.firstChild
    depth++
  }
  if (dispatch)
    dispatch(state.tr
             .clearIncompatible($pos.pos, before.type, before.contentMatchAt(before.childCount))
             .join($pos.pos, depth)
             .scrollIntoView())
  return true
}

function deleteBarrier(state, $cut, dispatch) {
  let before = $cut.nodeBefore, after = $cut.nodeAfter, conn, match
  if (before.type.spec.isolating || after.type.spec.isolating) return false
  if (joinMaybeClear(state, $cut, dispatch)) return true

  if ($cut.parent.canReplace($cut.index(), $cut.index() + 1) &&
  (conn = (match = before.contentMatchAt(before.childCount)).findWrapping(after.type)) &&
  match.matchType(conn[0] || after.type).validEnd) {
    if (dispatch) {
      let end = $cut.pos + after.nodeSize, wrap = Fragment.empty
      for (let i = conn.length - 1; i >= 0; i--)
      wrap = Fragment.from(conn[i].create(null, wrap))
      wrap = Fragment.from(before.copy(wrap))
      let tr = state.tr.step(new ReplaceAroundStep($cut.pos - 1, end, $cut.pos, end, new Slice(wrap, 1, 0), conn.length, true))

      let joinAt = end + 2 * conn.length
      if (canJoin(tr.doc, joinAt)) tr.join(joinAt)

      let mergeAt = $cut.pos - 1
      if (canJoin(tr.doc, mergeAt)) {
        tr.join(mergeAt, conn.length + 1)
      }

      dispatch(tr.scrollIntoView())
    }
    return true
  }

  let selAfter = Selection.findFrom($cut, 1)
  let range = selAfter && selAfter.$from.blockRange(selAfter.$to), target = range && liftTarget(range)
  if (target != null && target >= $cut.depth) {
    if (dispatch) dispatch(state.tr.lift(range, target).scrollIntoView())
    return true
  }

  return false
}


let backspace = chainCommands(deleteSelection, setParagraph, joinBackward, selectNodeBackward)

let enter = chainCommands(newlineInCode, splitListItem(schema.nodes.list_item), createParagraphNear, liftEmptyBlock, splitBlock, setParagraph)

let del = chainCommands(deleteSelection, joinForward, selectNodeForward)

let modEnter = chainCommands(exitCode)

let tab = chainCommands(sinkListItem(schema.nodes.list_item), goToNextCell(1))

let shiftTab = chainCommands(liftListItem(schema.nodes.list_item), goToNextCell(-1))

export let pcBaseKeymap = {
  "Enter": enter,
  "Mod-Enter": modEnter,
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
