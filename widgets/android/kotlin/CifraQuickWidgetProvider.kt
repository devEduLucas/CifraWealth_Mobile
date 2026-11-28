package __PACKAGE__.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.ComponentName
import android.content.Context
import android.graphics.Color
import android.content.Intent
import android.net.Uri
import android.view.View
import android.widget.RemoteViews
import __PACKAGE__.R

class CifraQuickWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { render(context, manager, it) }
  }

  companion object {
    private val FAVORITE_VIEW_IDS = listOf(
      R.id.cifra_quick_widget_favorite_1,
      R.id.cifra_quick_widget_favorite_2,
      R.id.cifra_quick_widget_favorite_3,
      R.id.cifra_quick_widget_favorite_4
    )

    @JvmStatic
    fun updateAll(context: Context) {
      val manager = AppWidgetManager.getInstance(context)
      val component = ComponentName(context, CifraQuickWidgetProvider::class.java)
      val ids = manager.getAppWidgetIds(component)
      ids.forEach { render(context, manager, it) }
    }

    private fun render(context: Context, manager: AppWidgetManager, appWidgetId: Int) {
      val views = RemoteViews(context.packageName, R.layout.cifra_quick_widget)
      val favorites = QuickWidgetSecureStore.readFavorites(context)
      val hasSession = QuickWidgetSecureStore.hasSession(context)

      views.setTextViewText(
        R.id.cifra_quick_widget_hint,
        if (!hasSession) "Abra o app para conectar o widget"
        else if (favorites.length() == 0) "Adicione seus favoritos no aplicativo"
        else "Toque para registrar sem abrir o app"
      )
      views.setTextViewText(R.id.cifra_quick_widget_status, QuickWidgetSecureStore.readLastStatus(context))
      views.setOnClickPendingIntent(R.id.cifra_quick_widget_brand, openWidgetSettingsIntent(context))

      for (index in FAVORITE_VIEW_IDS.indices) {
        val viewId = FAVORITE_VIEW_IDS[index]
        val favorite = favorites.optJSONObject(index)
        if (favorite == null) {
          views.setViewVisibility(viewId, View.GONE)
          continue
        }

        views.setViewVisibility(viewId, View.VISIBLE)
        val title = favorite.optString("titulo", "Favorito").take(28)
        val isExpense = favorite.optString("tipo") == "despesa"
        views.setTextViewText(viewId, title)
        views.setTextColor(
          viewId,
          Color.parseColor(if (isExpense) "#FCA5A5" else "#6EE7B7")
        )
        views.setInt(
          viewId,
          "setBackgroundResource",
          if (isExpense) R.drawable.cifra_quick_widget_expense_bg else R.drawable.cifra_quick_widget_income_bg
        )
        if (hasSession) {
          views.setOnClickPendingIntent(viewId, favoriteIntent(context, favorite.optInt("id_widget_favorite")))
        } else {
          views.setOnClickPendingIntent(viewId, openWidgetSettingsIntent(context))
        }
      }

      manager.updateAppWidget(appWidgetId, views)
    }

    private fun favoriteIntent(context: Context, favoriteId: Int): PendingIntent {
      val intent = Intent(context, QuickFavoriteReceiver::class.java).apply {
        action = "com.cifrawealth.app.widgets.ACTION_REGISTER_FAVORITE"
        data = Uri.parse("cifrawealth-widget://favorite/$favoriteId")
        putExtra(QuickFavoriteReceiver.EXTRA_FAVORITE_ID, favoriteId)
      }
      return PendingIntent.getBroadcast(
        context,
        4000 + favoriteId,
        intent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }

    private fun openWidgetSettingsIntent(context: Context): PendingIntent {
      val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName)
        ?: Intent(Intent.ACTION_MAIN)
      launchIntent.action = Intent.ACTION_VIEW
      launchIntent.data = Uri.parse("cifrawealth://favoritos-widget")
      launchIntent.addFlags(
        Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
      )
      launchIntent.addCategory(Intent.CATEGORY_DEFAULT)
      launchIntent.addCategory(Intent.CATEGORY_BROWSABLE)
      return PendingIntent.getActivity(
        context,
        3999,
        launchIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
      )
    }
  }
}
