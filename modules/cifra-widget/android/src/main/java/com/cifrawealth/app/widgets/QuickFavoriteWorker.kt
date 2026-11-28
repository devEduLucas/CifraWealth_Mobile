package com.cifrawealth.app.widgets

import android.content.Context
import androidx.work.CoroutineWorker
import androidx.work.WorkerParameters
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

class QuickFavoriteWorker(
  appContext: Context,
  params: WorkerParameters
) : CoroutineWorker(appContext, params) {

  override suspend fun doWork(): Result = withContext(Dispatchers.IO) {
    val favoriteId = inputData.getInt(INPUT_FAVORITE_ID, -1)
    val idempotencyKey = inputData.getString(INPUT_IDEMPOTENCY_KEY)
    if (favoriteId <= 0 || idempotencyKey.isNullOrBlank()) return@withContext Result.failure()

    val token = QuickWidgetSecureStore.readSessionToken(applicationContext)
    if (token.isNullOrBlank()) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Abra o app para reconectar.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      return@withContext Result.failure()
    }

    val favorite = QuickWidgetSecureStore.findFavorite(applicationContext, favoriteId)
    if (favorite == null) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Favorito não encontrado. Abra o app.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      return@withContext Result.failure()
    }

    val baseUrl = runCatching {
      applicationContext.getString(com.cifrawealth.app.R.string.cifra_quick_widget_api_url).trim().trimEnd('/')
    }.getOrDefault("")
    if (!baseUrl.startsWith("https://")) {
      QuickWidgetSecureStore.setLastStatus(applicationContext, "Configure a URL HTTPS da API.")
      CifraQuickWidgetProvider.updateAll(applicationContext)
      return@withContext Result.failure()
    }

    val apiBase = if (baseUrl.endsWith("/api")) baseUrl else "$baseUrl/api"
    val dateFormat = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
      timeZone = TimeZone.getDefault()
    }
    val body = JSONObject().apply {
      put("id_categoria", favorite.getInt("id_categoria"))
      put("valor", favorite.getDouble("valor"))
      put("tipo", favorite.getString("tipo"))
      put("descricao", favorite.getString("descricao"))
      put("data_transacao", dateFormat.format(Date()))
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
          Result.success()
        }
        code == 401 || code == 403 -> {
          QuickWidgetSecureStore.clearSessionToken(applicationContext)
          QuickWidgetSecureStore.setLastStatus(applicationContext, "Sessão do widget expirada. Abra o app.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
          Result.failure()
        }
        code == 429 || code >= 500 -> {
          QuickWidgetSecureStore.setLastStatus(applicationContext, "Servidor ocupado. Tentaremos novamente.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
          Result.retry()
        }
        else -> {
          QuickWidgetSecureStore.setLastStatus(applicationContext, "Não foi possível registrar. Revise no app.")
          CifraQuickWidgetProvider.updateAll(applicationContext)
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
      Result.failure()
    } finally {
      connection?.disconnect()
    }
  }

  companion object {
    const val INPUT_FAVORITE_ID = "favorite_id"
    const val INPUT_IDEMPOTENCY_KEY = "idempotency_key"
  }
}
