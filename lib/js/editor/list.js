import { findWrapping, liftTarget, canSplit, ReplaceAroundStep } from "prosemirror-transform"
import { Slice, Fragment, NodeRange } from "prosemirror-model"
import { schema } from './schema'

export function splitListItem(state, dispatch) {
  let {$from, $to, node} = state.selection
  if ((node && node.isBlock) || $from.depth < 2 || !$from.sameParent($to)) {
    return false
  }

  let grandParent = $from.node(-1)
  if (grandParent.type != schema.nodes.list_item) {
    return false
  }

  if ($from.parent.content.size == 0 && $from.node(-1).childCount == $from.indexAfter(-1)) {
    // In an empty block. If this is a nested list, the wrapping
    // list item should be split. Otherwise, bail out and let next
    // command handle lifting.
    if ($from.depth == 2 || $from.node(-3).type != schema.nodes.list_item ||
    $from.index(-2) != $from.node(-2).childCount - 1) return false
    if (dispatch) {
      let wrap = Fragment.empty, keepItem = $from.index(-1) > 0
      // Build a fragment containing empty versions of the structure
      // from the outer list item to the parent node of the cursor
      for (let d = $from.depth - (keepItem ? 1 : 2); d >= $from.depth - 3; d--)
      wrap = Fragment.from($from.node(d).copy(wrap))
      // Add a second list item with an empty default start node
      wrap = wrap.append(Fragment.from(schema.nodes.list_item.createAndFill()))
      let tr = state.tr.replace($from.before(keepItem ? null : -1), $from.after(-3), new Slice(wrap, keepItem ? 3 : 2, 2))
      tr.setSelection(state.selection.constructor.near(tr.doc.resolve($from.pos + (keepItem ? 3 : 2))))
      dispatch(tr.scrollIntoView())
    }
    return true
  }
  let nextType = $to.pos == $from.end() ? grandParent.contentMatchAt(0).defaultType : null
  let tr = state.tr.delete($from.pos, $to.pos)
  let types = nextType && [null, {type: nextType}]
  if (!canSplit(tr.doc, $from.pos, 2, types)) {
    return false
  }
  if (dispatch) {
    dispatch(tr.split($from.pos, 2, types).scrollIntoView())
  }
  return true
}

export function liftListItem(state, dispatch) {
  let {$from, $to} = state.selection
  let range = $from.blockRange($to, node => node.childCount && node.firstChild.type == schema.nodes.list_item)
  if (!range) return false
  if (!dispatch) return true
  if ($from.node(range.depth - 1).type == schema.nodes.list_item) {
    // Inside a parent list
    return liftToOuterList(state, dispatch, range)
  } else {
    // Outer list node
    return liftOutOfList(state, dispatch, range)
  }
}

function liftToOuterList(state, dispatch, range) {
  let tr = state.tr, end = range.end, endOfList = range.$to.end(range.depth)
  if (end < endOfList) {
    let itemNode = state.doc.resolve(range.start).nodeAfter
    console.log(itemNode)

    if (itemNode.childCount > 1) {
      // sublist exists
      let subListNode = itemNode.lastChild
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
        new ReplaceAroundStep(end - 2, endOfList, end, endOfList, slice, 0, true)
      )
    } else {
      // sublist not exists
      let listNode = range.parent
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
        new ReplaceAroundStep(end - 1, endOfList, end, endOfList, slice, 1, true)
      )
    }
    range = new NodeRange(tr.doc.resolve(range.$from.pos), tr.doc.resolve(endOfList), range.depth)
  }
  dispatch(tr.lift(range, liftTarget(range)).scrollIntoView())
  return true
}

function liftOutOfList(state, dispatch, range) {
  let tr = state.tr, list = range.parent
  // Merge the list items into a single big item
  for (let pos = range.end, i = range.endIndex - 1, e = range.startIndex; i > e; i--) {
    pos -= list.child(i).nodeSize
    tr.delete(pos - 1, pos + 1)
  }
  let $start = tr.doc.resolve(range.start), item = $start.nodeAfter
  let atStart = range.startIndex == 0, atEnd = range.endIndex == list.childCount
  let parent = $start.node(-1), indexBefore = $start.index(-1)
  if (!parent.canReplace(indexBefore + (atStart ? 0 : 1), indexBefore + 1,
                         item.content.append(atEnd ? Fragment.empty : Fragment.from(list))))
    return false
  let start = $start.pos, end = start + item.nodeSize
  // Strip off the surrounding list. At the sides where we're not at
  // the end of the list, the existing list is closed. At sides where
  // this is the end, it is overwritten to its end.
  tr.step(new ReplaceAroundStep(start - (atStart ? 1 : 0), end + (atEnd ? 1 : 0), start + 1, end - 1,
                                new Slice((atStart ? Fragment.empty : Fragment.from(list.copy(Fragment.empty)))
                                          .append(atEnd ? Fragment.empty : Fragment.from(list.copy(Fragment.empty))),
                                          atStart ? 0 : 1, atEnd ? 0 : 1), atStart ? 0 : 1))
  dispatch(tr.scrollIntoView())
  return true
}

// :: (NodeType) → (state: EditorState, dispatch: ?(tr: Transaction)) → bool
// Create a command to sink the list item around the selection down
// into an inner list.
export function sinkListItem(state, dispatch) {
  let {$from, $to} = state.selection
  let range = $from.blockRange($to, node => node.childCount && node.firstChild.type == schema.nodes.list_item)
  if (!range) {
    return false
  }

  return sinkToInnerList(state, dispatch, range)
}

function sinkToInnerList(state, dispatch, range) {
  let startIndex = range.startIndex
  if (startIndex == 0) {
    return false
  }

  let parent = range.parent
  let nodeBefore = parent.child(startIndex - 1)
  if (nodeBefore.type != schema.nodes.list_item) {
    return false
  }

  if (dispatch) {
    let nestedBefore = nodeBefore.lastChild && nodeBefore.lastChild.type == parent.type
    let inner = Fragment.from(nestedBefore ? schema.nodes.list_item.create() : null)
    let slice = new Slice(Fragment.from(schema.nodes.list_item.create(null, Fragment.from(parent.type.create(null, inner)))),
                          nestedBefore ? 3 : 1, 0)
    let before = range.start, after = range.end
    dispatch(state.tr.step(new ReplaceAroundStep(before - (nestedBefore ? 3 : 1), after,
                                                 before, after, slice, 1, true))
             .scrollIntoView())
  }
  return true
}

export function joinListBackward(state, dispatch) {
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
        let range = $cursor.blockRange($cursor, node => node.childCount && node.firstChild.type == schema.nodes.list_item)
        sinkToInnerList(state, dispatch, range)
      }
    } else {
      // first list_item
      return liftListItem(state, dispatch)
    }
  }

  return true
}

export function joinListForward(state, dispatch) {
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
      let mergeDepth
      // find next item, it maybe in grand parent list
      for (let depth = $cursor.depth - 1; depth > 1; depth -= 2) {
        if ($cursor.index(depth - 1) < $cursor.node(depth - 1).childCount - 1) {
          mergeDepth = depth
          break
        }
      }

      if (mergeDepth) {
        if (dispatch) {
          let itemNode = $cursor.doc.resolve($cursor.after(mergeDepth)).nodeAfter
          let itemBefore = $cursor.after(mergeDepth)
          let itemAfter = itemBefore + itemNode.nodeSize
          let range = new NodeRange($cursor.doc.resolve(itemBefore), $cursor.doc.resolve(itemAfter), mergeDepth - 1)
          return sinkToInnerList(state, dispatch, range)
        }

        return true
      } else {
        // last item, pass
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
      liftToOuterList(state, dispatch, range)
    }
    return true
  }
}
