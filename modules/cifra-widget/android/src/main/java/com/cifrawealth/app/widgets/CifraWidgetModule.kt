package com.cifrawealth.app.widgets

import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition

class CifraWidgetModule : Module() {
  override fun definition() = ModuleDefinition {
    Name("CifraWidget")

    AsyncFunction("setSession") { token: String, apiBaseUrl: String ->
      require(token.length in 32..256) { "Invalid widget session token." }
      require(apiBaseUrl.startsWith("https://")) { "The widget requires an HTTPS API URL." }
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable.")
      QuickWidgetSecureStore.saveSession(context, token, apiBaseUrl)
      CifraQuickWidgetProvider.updateAll(context)
    }

    AsyncFunction("setFavorites") { favoritesJson: String ->
      require(favoritesJson.toByteArray(Charsets.UTF_8).size <= 16 * 1024) { "Widget favorites payload is too large." }
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable.")
      QuickWidgetSecureStore.saveFavorites(context, favoritesJson)
      CifraQuickWidgetProvider.updateAll(context)
    }

    AsyncFunction("clearAccess") {
      val context = appContext.reactContext ?: throw IllegalStateException("React context is unavailable.")
      QuickWidgetSecureStore.clear(context)
      CifraQuickWidgetProvider.updateAll(context)
    }
  }
}
