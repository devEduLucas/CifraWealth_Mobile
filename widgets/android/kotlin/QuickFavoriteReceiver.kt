package __PACKAGE__.widgets

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
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID
import java.util.concurrent.TimeUnit

class QuickFavoriteReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    val favoriteId = intent.getIntExtra(EXTRA_FAVORITE_ID, -1)
    if (favoriteId <= 0) return

    if (!QuickWidgetSecureStore.hasSession(context)) {
      QuickWidgetSecureStore.setLastStatus(context, "Abra o CifraWealth para reconectar o widget.")
      CifraQuickWidgetProvider.updateAll(context)
      return
    }

    if (!QuickWidgetSecureStore.shouldAcceptFavoriteTap(context, favoriteId)) return

    val favorite = QuickWidgetSecureStore.findFavorite(context, favoriteId)
    if (favorite == null) {
      QuickWidgetSecureStore.setLastStatus(context, "Atualize seus favoritos no aplicativo.")
      CifraQuickWidgetProvider.updateAll(context)
      return
    }

    // Snapshot the exact favorite at tap time. A queued request must not change
    // if the user edits the favorite before WorkManager gets network access.
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
      timeZone = TimeZone.getDefault()
    }
    val favoriteSnapshot = favorite.put("data_transacao", dateFormat.format(Date()))
    val requestKey = UUID.randomUUID().toString()
    try {
      QuickWidgetSecureStore.savePendingFavoriteSnapshot(context, requestKey, favoriteSnapshot.toString())
    } catch (_: Exception) {
      QuickWidgetSecureStore.setLastStatus(context, "Não foi possível salvar a tarefa com segurança.")
      CifraQuickWidgetProvider.updateAll(context)
      return
    }

    val input = Data.Builder()
      .putString(QuickFavoriteWorker.INPUT_SNAPSHOT_KEY, requestKey)
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

    try {
      WorkManager.getInstance(context).enqueueUniqueWork(
        "cifra-widget-$requestKey",
        ExistingWorkPolicy.KEEP,
        request
      )
    } catch (_: Exception) {
      QuickWidgetSecureStore.removePendingFavoriteSnapshot(context, requestKey)
      QuickWidgetSecureStore.setLastStatus(context, "Não foi possível agendar o registro. Abra o app.")
      CifraQuickWidgetProvider.updateAll(context)
    }
  }

  companion object {
    const val EXTRA_FAVORITE_ID = "com.cifrawealth.app.widgets.extra.FAVORITE_ID"
  }
}
