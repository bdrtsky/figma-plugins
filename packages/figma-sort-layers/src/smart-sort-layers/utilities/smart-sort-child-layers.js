import { computeBoundingBox } from './compute-bounding-box'

export function smartSortChildLayers (layer, childLayerIds) {
  const children = layer.children
  if (
    typeof children === 'undefined' ||
    children.length < 2 ||
    layer.type === 'INSTANCE'
  ) {
    return null
  }
  const childLayers =
    typeof childLayerIds === 'undefined'
      ? children
      : children.filter(function (layer) {
          return childLayerIds.indexOf(layer.id) !== -1
        })
  const [firstChildLayer, ...remainingChildLayers] = childLayers
  const result = [firstChildLayer]
  for (const childLayer of remainingChildLayers) {
    let i = 0
    let insertedChildLayer = false
    while (i < result.length) {
      const resultLayer = result[i]
      if (
        checkIfLayersOverlap(childLayer, resultLayer) === true ||
        compareLayerPosition(childLayer, resultLayer) === true
      ) {
        result.splice(i, 0, childLayer)
        insertedChildLayer = true
        break
      }
      i++
    }
    if (insertedChildLayer === false) {
      result.splice(result.length, 0, childLayer)
    }
  }
  return result
}

function checkIfLayersOverlap (a, b) {
  const aa = computeBoundingBox(a)
  const bb = computeBoundingBox(b)
  return !(
    aa.x + aa.width <= bb.x ||
    bb.x + bb.width <= aa.x ||
    aa.y + aa.height <= bb.y ||
    bb.y + bb.height <= aa.y
  )
}

function compareLayerPosition (a, b) {
  // Returns `true` if `a` should be moved before `b` in the list
  const aa = computeBoundingBox(a)
  const bb = computeBoundingBox(b)
  const yPositionDifference = aa.y - bb.y
  if (yPositionDifference !== 0) {
    return yPositionDifference < 0
  }
  return aa.x - bb.x < 0
}
