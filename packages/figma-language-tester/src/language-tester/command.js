import {
  emit,
  formatErrorMessage,
  formatSuccessMessage,
  loadFontsAsync,
  loadSettingsAsync,
  on,
  showUI,
  traverseLayer
} from '@create-figma-plugin/utilities'
import { defaultSettings } from '../default-settings'
import { getTextLayers } from '../get-text-layers'
import languages from '../translate/languages'

export default async function () {
  const { apiKey } = await loadSettingsAsync(defaultSettings)
  if (typeof apiKey === 'undefined' || apiKey === '') {
    figma.closePlugin(
      formatErrorMessage(
        'Add an API key via Plugins › Language Tester › Set API Key'
      ),
      { timeout: 10000 }
    )
    return
  }
  const { layers, scope } = getTextLayers()
  if (layers.length === 0) {
    figma.closePlugin(formatErrorMessage(`No text layers ${scope}`))
    return
  }
  showUI({ width: 240, height: 267 })
  const originalStrings = {} // maps `layer.id` to the original strings
  figma.on('close', function () {
    resetLanguage(originalStrings)
  })
  let notificationHandler
  on('SET_LANGUAGE', async function ({ languageKey }) {
    notificationHandler = figma.notify('Translating…', { timeout: 60000 })
    const { layers, scope } = getTextLayers()
    layers.forEach(function (layer) {
      if (typeof originalStrings[layer.id] === 'undefined') {
        originalStrings[layer.id] = layer.characters
      }
    })
    await loadFontsAsync(layers)
    emit('TRANSLATE_REQUEST', {
      apiKey,
      languageKey,
      layers: layers.map(function ({ id, characters }) {
        return { id, characters }
      }),
      scope
    })
  })
  on('TRANSLATE_RESULT', async function ({ languageKey, layers, scope }) {
    notificationHandler.cancel()
    for (const { id, characters } of layers) {
      const layer = figma.getNodeById(id)
      layer.characters = characters
    }
    figma.notify(
      formatSuccessMessage(
        `Translated text ${scope} to ${languages[languageKey]}`
      )
    )
  })
  on('RESET_LANGUAGE', function () {
    resetLanguage(originalStrings)
  })
  on('CLOSE_UI', function () {
    figma.closePlugin()
  })
}

function resetLanguage (originalStrings) {
  const layers = filterLayers([figma.currentPage], function (layer) {
    return (
      layer.type === 'TEXT' && typeof originalStrings[layer.id] !== 'undefined'
    )
  })
  let didChange = false
  layers.forEach(function (layer) {
    if (layer.characters !== originalStrings[layer.id]) {
      didChange = true
      layer.characters = originalStrings[layer.id]
    }
  })
  if (didChange === true) {
    figma.notify('Reset')
  }
}

function filterLayers (layers, filter) {
  const result = []
  for (const layer of layers) {
    traverseLayer(layer, async function (layer) {
      if (filter(layer) === true) {
        result.push(layer)
      }
    })
  }
  return result
}
