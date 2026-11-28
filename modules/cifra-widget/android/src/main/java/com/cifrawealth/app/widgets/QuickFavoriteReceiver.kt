package com.cifrawealth.app.widgets

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import androidx.work.BackoffPolicy
import androidx.work.Constraints
import androidx.work.Data
import androidx.work.ExistingWorkPolicy
import androidx.work.NetworkType
import androidx.work.OneTimeWorkRequestBuilder
import androidx.work.OutOfQuotaPolicy
import androidx.work.WorkManager
import java.nio.charset.StandardCharsets
import java.util.UUID
import java.util.concurrent.TimeUnit

class QuickFavoriteReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val favoriteId = intent.getIntExtra(EXTRA_FAVORITE_ID, -1)
    if (favoriteId <= 0) return

    if (!QuickWidgetSecureStore.hasSession(context)) {
      openWidgetSetup(context)
      return
    }

    val favorite = QuickWidgetSecureStore.findFavorite(context, favoriteId)
    if (favorite == null) {
      QuickWidgetSecureStore.setLastStatus(context, "Atualize seus favoritos no aplicativo.")
      CifraQuickWidgetProvider.updateAll(context)
      return
    }

    // A short time bucket suppresses accidental double taps on the same favorite.
    // WorkManager also keeps the same unique request while that action is queued.
    val bucket = System.currentTimeMillis() / 5_000L
    val requestKey = UUID.nameUUIDFromBytes(
      "cifra-widget:$favoriteId:$bucket".toByteArray(StandardCharsets.UTF_8)
    ).toString()

    val input = Data.Builder()
      .putInt(QuickFavoriteWorker.INPUT_FAVORITE_ID, favoriteId)
      .putString(QuickFavoriteWorker.INPUT_IDEMPOTENCY_KEY, requestKey)
      .build()

    val constraints = Constraints.Builder()
      .setRequiredNetworkType(NetworkType.CONNECTED)
      .build()

    val request = OneTimeWorkRequestBuilder<QuickFavoriteWorker>()
      .setInputData(input)
      .setConstraints(constraints)
      .setBackoffCriteria(BackoffPolicy.EXPONENTIAL, 20, TimeUnit.SECONDS)
      .setExpedited(OutOfQuotaPolicy.RUN_AS_NON_EXPEDITED_WORK_REQUEST)
      .build()

    QuickWidgetSecureStore.setLastStatus(context, "Aguardando registro…")
    CifraQuickWidgetProvider.updateAll(context)

    WorkManager.getInstance(context).enqueueUniqueWork(
      "cifra-widget-$requestKey",
      ExistingWorkPolicy.KEEP,
      request
    )
  }

  private fun openWidgetSetup(context: Context) {
    val launchIntent = context.packageManager.getLaunchIntentForPackage(context.packageName) ?: return
    launchIntent.action = Intent.ACTION_VIEW
    launchIntent.data = android.net.Uri.parse("cifrawealth://favoritos-widget")
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK or Intent.FLAG_ACTIVITY_CLEAR_TOP or Intent.FLAG_ACTIVITY_SINGLE_TOP)
    launchIntent.addCategory(Intent.CATEGORY_DEFAULT)
    launchIntent.addCategory(Intent.CATEGORY_BROWSABLE)
    context.startActivity(launchIntent)
  }

  companion object {
    const val EXTRA_FAVORITE_ID = "com.cifrawealth.app.widgets.extra.FAVORITE_ID"
  }
}
