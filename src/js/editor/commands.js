import { chainCommands, deleteSelection, selectNodeBackward, newlineInCode, createParagraphNear, liftEmptyBlock, splitBlock, exitCode, selectNodeForward, selectAll, joinBackward, joinForward } from "prosemirror-commands"
import { undo, redo } from "prosemirror-history"
import { setBlockType } from "prosemirror-commands"
import { Selection, NodeSelection } from "prosemirror-state"
import { Slice, Fragment } from "prosemirror-model"
import {joinPoint, canJoin, findWrapping, liftTarget, canSplit, ReplaceAroundStep, ReplaceStep} from "prosemirror-transform"
import { splitListItem as splitListItemGen, liftListItem as liftListItemGen, sinkListItem as sinkListItemGen } from "prosemirror-schema-list"
import { goToNextCell } from 'prosemirror-tables'
import { schema } from "./schema"

let splitListItem = splitListItemGen(schema.nodes.list_item)
let liftListItem = liftListItemGen(schema.nodes.list_item)
let sinkListItem = sinkListItemGen(schema.nodes.list_item)

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

function joinListBackward(state, dispatch) {
  let { $cursor } = state.selection

  // is text begin
  if (!$cursor || $cursor.parentOffset != 0 ) {
    return false
  }

  // in list_item begin
  if ($cursor.depth < 2 || $cursor.node(-1).type != schema.nodes.list_item || $cursor.index(-1) != 0) {
    return false
  }

  if (dispatch) {
    if ($cursor.index(-2) > 0) {
      // not first list_item
      if ($cursor.doc.resolve($cursor.before(-1)).nodeBefore.childCount == 1) {
        // simple join two list_item
        dispatch(
          state.tr.join($cursor.before(-1), 2)
        )
      } else {
        // join to pre list_item's sub list
        let preSubListEnd = $cursor.before(-1) - 2
        let tr = state.tr
          .delete($cursor.before(-1), $cursor.after(-1))
          .replaceWith(preSubListEnd, preSubListEnd, $cursor.node(-1))
        dispatch(
          tr.setSelection(Selection.near(tr.doc.resolve(preSubListEnd)))
        )
      }
    } else {
      // first list_item
      // Fixme: schema conflic
      return liftListItem(state, dispatch)
    }
  }

  return true
}

function joinListForward(state, dispatch) {
  let { $cursor } = state.selection

  // is text end
  if (!$cursor || $cursor.parentOffset != $cursor.parent.content.size ) {
    return false
  }

  // in list_item
  if ($cursor.depth < 2 || $cursor.node(-1).type != schema.nodes.list_item) {
    return false
  }

  if ($cursor.node(-1).childCount == 1) {
    // not has sublist

    if ($cursor.index(-2) < $cursor.node(-2).childCount - 1) {
      // not last item, simple join
      if (dispatch) {
        dispatch(
          state.tr.join($cursor.after(-1), 2)
        )
      }
      return true
    } else {
      // last item, pass
      let mergeDepth
      // find next item
      for (let depth = $cursor.depth - 1; depth > 1; depth -= 2) {
        if ($cursor.index(depth - 1) < $cursor.node(depth - 1).childCount - 1) {
          mergeDepth = depth
          break
        }
      }

      if (mergeDepth) {
        if (dispatch) {
          let nextItemNode = $cursor.doc.resolve($cursor.after(mergeDepth)).nodeAfter
          let targetListNode = $cursor.node(mergeDepth + 1)
          let targetListEnd = $cursor.end(mergeDepth + 1)
          let nextItemStart = $cursor.after(mergeDepth)
          let nextItemEnd = nextItemStart + nextItemNode.nodeSize
          let tr = state.tr
          let slice = new Slice(
            Fragment.from(
              schema.nodes.list_item.create(
                null, targetListNode.type.create(
                  null, null
                )
              )
            ), 2, 0
          )
          tr.step(new ReplaceAroundStep(targetListEnd, nextItemEnd, nextItemStart, nextItemEnd, slice, 0))

          dispatch(tr)
        }

        return true
      } else {
        // pass
        return false
      }
    }

  } else {
    // has sublist, lift sublist's first item
    if (dispatch) {
      let itemBefore = $cursor.after() + 1
      let itemNode = $cursor.doc.resolve(itemBefore).nodeAfter
      let itemAfter = itemBefore + itemNode.nodeSize
      let range = $cursor.doc.resolve(itemBefore).blockRange($cursor.doc.resolve(itemAfter))
      let listEnd = range.$to.end(range.depth)
      let tr = state.tr

      if (itemAfter < listEnd) {
        // has sibling items, move to sublist
        if (itemNode.childCount > 1) {
          // sublist exists
          let subListNode = $cursor.doc.resolve(itemAfter - 1).nodeBefore
          let slice = new Slice(
            Fragment.from(
              schema.nodes.list_item.create(
                null, subListNode.type.create(
                  null, null
                )
              )
            ), 2, 0
          )
          tr.step(
            new ReplaceAroundStep(itemAfter - 2, listEnd, itemAfter, listEnd, slice, 0, true)
          )
        } else {
          // sublist not exists
          let listNode = $cursor.doc.resolve($cursor.after()).nodeAfter
          let slice = new Slice(
            Fragment.from(
              schema.nodes.list_item.create(
                null, listNode.type.create(
                  null, null
                )
              )
            ), 1, 0
          )
          tr.step(
            new ReplaceAroundStep(itemAfter - 1, listEnd, itemAfter, listEnd, slice, 1, true)
          )
        }
        let newRangeBefore = tr.doc.resolve(itemBefore)
        let newRangeAfter = tr.doc.resolve(newRangeBefore.pos + newRangeBefore.nodeAfter.nodeSize)
        range = newRangeBefore.blockRange(newRangeAfter)
      }

      dispatch(
        tr.lift(range, liftTarget(range))
      )
    }
    return true
  }
}


let backspace = chainCommands(deleteSelection, setParagraph, joinListBackward, joinBackward, selectNodeBackward)

let enter = chainCommands(newlineInCode, splitListItem, createParagraphNear, liftEmptyBlock, createBlockAfterIsolating, splitBlock)

let del = chainCommands(deleteSelection, joinListForward, joinForward, selectNodeForward)

let modEnter = chainCommands(exitCode)

let tab = chainCommands(sinkListItem, goToNextCell(1))

let shiftTab = chainCommands(liftListItem, goToNextCell(-1))

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
