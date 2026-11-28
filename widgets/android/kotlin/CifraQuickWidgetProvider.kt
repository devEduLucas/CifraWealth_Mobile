package __PACKAGE__.widgets

import android.app.PendingIntent
import android.appwidget.AppWidgetManager
import android.appwidget.AppWidgetProvider
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.widget.RemoteViews
import __PACKAGE__.R

/**
 * Android home-screen entry point for the two fast transaction flows.
 * The widget intentionally shows no balances or other private financial data.
 */
class CifraQuickWidgetProvider : AppWidgetProvider() {
  override fun onUpdate(context: Context, manager: AppWidgetManager, appWidgetIds: IntArray) {
    appWidgetIds.forEach { appWidgetId ->
      val views = RemoteViews(context.packageName, R.layout.cifra_quick_widget)
      quickEntryPendingIntent(context, "despesa", 1001)?.let {
        views.setOnClickPendingIntent(R.id.cifra_quick_widget_expense, it)
      }
      quickEntryPendingIntent(context, "receita", 1002)?.let {
        views.setOnClickPendingIntent(R.id.cifra_quick_widget_income, it)
      }
      manager.updateAppWidget(appWidgetId, views)
    }
  }

  private fun quickEntryPendingIntent(context: Context, type: String, requestCode: Int): PendingIntent? {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return null
    launchIntent.action = Intent.ACTION_VIEW
    launchIntent.data = Uri.parse("cifrawealth://nova-transacao?tipo=$type")
    launchIntent.addFlags(
      Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP
    )
    launchIntent.addCategory(Intent.CATEGORY_DEFAULT)
    launchIntent.addCategory(Intent.CATEGORY_BROWSABLE)
    return PendingIntent.getActivity(
      context,
      requestCode,
      launchIntent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
    )
  }
}
