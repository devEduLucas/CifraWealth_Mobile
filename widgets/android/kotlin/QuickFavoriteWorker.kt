package __PACKAGE__.widgets

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class QuickFavoriteWorker(
  appContext: Context,
  params: WorkerParameters
) : CoroutineWorker(appContext, params) {

  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val snapshotKey = inputData.getString(INPUT_SNAPSHOT_KEY)
    val idempotencyKey = inputData.getString(INPUT_IDEMPOTENCY_KEY)
    if (snapshotKey.isNullOrBlank() || idempotencyKey.isNullOrBlank()) return@withContext Result.failure()

    val favoriteJson = QuickWidgetSecureStore.readPendingFavoriteSnapshot(applicationContext, snapshotKey)
    if (favoriteJson.isNullOrBlank()) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Dados da tarefa não encontrados. Abra o app.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      return@withContext Result.failure()
    }

    val token = QuickWidgetSecureStore.readSessionToken(applicationContext)
    if (token.isNullOrBlank()) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Abra o app para reconectar.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
      return@withContext Result.failure()
    }

    val favorite = try {
      JSONObject(favoriteJson)
    } catch (_: Exception) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Dados do favorito inválidos. Abra o app.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
      return@withContext Result.failure()
    }

    val baseUrl = QuickWidgetSecureStore.readApiBaseUrl(applicationContext).orEmpty().trim().trimEnd('/')
    if (!baseUrl.startsWith("https://")) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Configure a URL HTTPS da API.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
      return@withContext Result.failure()
    }

    val apiBase = if (baseUrl.endsWith("/api")) baseUrl else "$baseUrl/api"
    val body = JSONObject().apply {
      put("id_widget_favorite", favorite.getInt("id_widget_favorite"))
      put("fingerprint", favorite.getString("fingerprint"))
      put("data_transacao", favorite.getString("data_transacao"))
    }.toString()

    var connection: HttpURLConnection? = null
    try {
      connection = URL("$apiBase/widgets/quick-transactions").openConnection() as HttpURLConnection
      connection.requestMethod = "POST"
      connection.connectTimeout = 12_000
      connection.readTimeout = 15_000
      connection.doOutput = true
      connection.setRequestProperty("Authorization", "Bearer $token")
      connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
      connection.setRequestProperty("Accept", "application/json")
      connection.setRequestProperty("Idempotency-Key", idempotencyKey)
      connection.outputStream.use { output ->
        output.write(body.toByteArray(Charsets.UTF_8))
      }

      val code = connection.responseCode
      when {
        code in 200..299 -> {
          QuickWidgetSecureStore.setLastStatus(applicationContext, "✓ ${favorite.optString("titulo")} registrado.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
          QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
          Result.success()
        }
        code == 401 || code == 403 -> {
          val cleared = QuickWidgetSecureStore.clearSessionTokenIfMatches(applicationContext, token)
          QuickWidgetSecureStore.setLastStatus(
            applicationContext,
            if (cleared) "Sessão do widget expirada. Abra o app." else "Reconectando widget. Tentaremos novamente."
          )
          CifraQuickWidgetProvider.updateAll(applicationContext)
          if (cleared) {
            QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
            Result.failure()
          } else Result.retry()
        }
        code == 404 || code == 409 -> {
          QuickWidgetSecureStore.setLastStatus(applicationContext, "Favorito removido ou alterado. Abra o app para sincronizar.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
          QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
          Result.failure()
        }
        code == 408 || code == 429 || code >= 500 -> {
          QuickWidgetSecureStore.setLastStatus(applicationContext, "Servidor ocupado. Tentaremos novamente.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
          Result.retry()
        }
        else -> {
          QuickWidgetSecureStore.setLastStatus(applicationContext, "Não foi possível registrar. Revise no app.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
          QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
          Result.failure()
        }
      }
    } catch (_: IOException) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Sem conexão. Tentaremos novamente.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      Result.retry()
    } catch (_: Exception) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Falha no registro. Abra o app.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      QuickWidgetSecureStore.removePendingFavoriteSnapshot(applicationContext, snapshotKey)
      Result.failure()
    } finally {
      connection?.disconnect()
    }
  }

  companion object {
    const val INPUT_SNAPSHOT_KEY = "snapshot_key"
    const val INPUT_IDEMPOTENCY_KEY = "idempotency_key"
  }
}
