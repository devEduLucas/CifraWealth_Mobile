package __PACKAGE__

import android.os.Build
import androidx.annotation.RequiresApi
import androidx.appfunctions.AppFunctionAppUnknownException
import androidx.appfunctions.AppFunctionDeclaration
import androidx.appfunctions.AppFunctionException
import androidx.appfunctions.AppFunctionInvalidArgumentException
import androidx.appfunctions.AppFunctionPermissionRequiredException
import androidx.appfunctions.AppFunctionSerializable
import androidx.appfunctions.AppFunctionService
import androidx.appfunctions.AppFunctionServiceEntryPoint
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.IOException
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone
import java.util.UUID

/** A CifraWealth category available for a new transaction. */
@AppFunctionSerializable(isDescribedByKDoc = true)
data class AssistantTransactionCategory(
  /** The category identifier used when creating a transaction. */
  val id: Int,
  /** The category name shown in CifraWealth. */
  val name: String,
  /** The category type: receita or despesa. */
  val type: String,
)

@RequiresApi(36)
@AppFunctionServiceEntryPoint(
  serviceName = "CifraWealthAppFunctionService",
  appFunctionXmlFileName = "cifra_wealth_app_functions",
)
abstract class BaseCifraWealthAppFunctionService : AppFunctionService() {

  /**
   * Lists the signed-in user's transaction categories from CifraWealth.
   *
   * Call this before creating a transaction to choose a category that belongs to the user.
   * The optional transactionType must be receita or despesa. This function returns category
   * identifiers, names and types only. It does not return transaction history or balances.
   *
   * @param transactionType Optional category type filter: receita or despesa.
   * @return The user's categories that can be used for a new transaction.
   */
  @AppFunctionDeclaration(isDescribedByKDoc = true)
  suspend fun listTransactionCategories(
    transactionType: String? = null,
  ): List<AssistantTransactionCategory> = withContext(Dispatchers.IO) {
    try {
      val normalizedType = transactionType?.trim()?.lowercase(Locale.ROOT)?.takeIf { it.isNotEmpty() }
      if (normalizedType != null && normalizedType !in setOf("receita", "despesa")) {
        throw AppFunctionInvalidArgumentException("O tipo deve ser receita ou despesa.")
      }

      val query = normalizedType?.let {
        "?tipo=" + URLEncoder.encode(it, Charsets.UTF_8.name())
      }.orEmpty()
      val response = request("GET", "/widgets/assistant/categories$query")
      ensureSuccessful(response.first, "Não foi possível consultar as categorias do CifraWealth.")

      val json = JSONArray(response.second)
      buildList {
        for (index in 0 until json.length()) {
          val item = json.optJSONObject(index) ?: continue
          add(
            AssistantTransactionCategory(
              id = item.getInt("id_categoria"),
              name = item.getString("nome"),
              type = item.getString("tipo"),
            )
          )
        }
      }
    } catch (error: AppFunctionException) {
      throw error
    } catch (_: Exception) {
      throw AppFunctionAppUnknownException("Não foi possível consultar as categorias do CifraWealth. Tente novamente.")
    }
  }

  /**
   * Creates a transaction in the signed-in user's CifraWealth account.
   *
   * Use only when the user explicitly asks to record a transaction. Do not invent an amount,
   * description, category or transaction type. Call listTransactionCategories first when the
   * correct user category is not known. Ask the user for missing information before calling.
   * The transaction is sent to the CifraWealth server, which validates ownership and category
   * type and prevents duplicate requests. This function cannot edit or delete transactions.
   *
   * @param transactionType The transaction type: receita or despesa.
   * @param amount The transaction amount in Brazilian reais, greater than zero, with up to two decimal places.
   * @param description A short transaction description, up to 200 characters.
   * @param categoryId The identifier of one of the user's categories returned by listTransactionCategories.
   * @param transactionDate Optional transaction date in YYYY-MM-DD format. If omitted, today's local date is used.
   * @return A confirmation that the transaction was recorded in CifraWealth.
   */
  @AppFunctionDeclaration(isDescribedByKDoc = true)
  suspend fun createTransaction(
    transactionType: String,
    amount: Double,
    description: String,
    categoryId: Int,
    transactionDate: String? = null,
  ): String = withContext(Dispatchers.IO) {
    try {
      val normalizedType = transactionType.trim().lowercase(Locale.ROOT)
      if (normalizedType !in setOf("receita", "despesa")) {
        throw AppFunctionInvalidArgumentException("O tipo deve ser receita ou despesa.")
      }
      if (!amount.isFinite() || amount <= 0.0 || amount > 99_999_999.99) {
        throw AppFunctionInvalidArgumentException("Informe um valor positivo válido em reais.")
      }
      if (kotlin.math.abs(amount * 100.0 - kotlin.math.round(amount * 100.0)) > 0.00001) {
        throw AppFunctionInvalidArgumentException("O valor pode ter no máximo duas casas decimais.")
      }
      val normalizedDescription = description.trim()
      if (normalizedDescription.isEmpty() || normalizedDescription.length > 200) {
        throw AppFunctionInvalidArgumentException("A descrição deve ter entre 1 e 200 caracteres.")
      }
      if (categoryId <= 0) {
        throw AppFunctionInvalidArgumentException("Selecione uma categoria válida do CifraWealth.")
      }

      val date = normalizeTransactionDate(transactionDate)
      val body = JSONObject().apply {
        put("id_categoria", categoryId)
        put("valor", amount)
        put("tipo", normalizedType)
        put("descricao", normalizedDescription)
        put("data_transacao", date)
      }
      val response = request(
        method = "POST",
        path = "/widgets/assistant/transactions",
        body = body,
        idempotencyKey = UUID.randomUUID().toString(),
      )
      ensureSuccessful(response.first, "Não foi possível registrar a transação no CifraWealth.")
      "Transação registrada no CifraWealth."
    } catch (error: AppFunctionException) {
      throw error
    } catch (_: Exception) {
      throw AppFunctionAppUnknownException("Não foi possível registrar a transação. Tente novamente ou abra o CifraWealth.")
    }
  }

  private fun normalizeTransactionDate(value: String?): String {
    if (value.isNullOrBlank()) {
      return SimpleDateFormat("yyyy-MM-dd", Locale.US).format(Date())
    }

    val normalized = value.trim()
    if (!normalized.matches(Regex("^\\d{4}-\\d{2}-\\d{2}$"))) {
      throw AppFunctionInvalidArgumentException("A data deve estar no formato AAAA-MM-DD.")
    }

    val formatter = SimpleDateFormat("yyyy-MM-dd", Locale.US).apply {
      isLenient = false
      timeZone = TimeZone.getTimeZone("UTC")
    }
    val parsed = try {
      formatter.parse(normalized)
    } catch (_: Exception) {
      null
    }
    if (parsed == null || formatter.format(parsed) != normalized) {
      throw AppFunctionInvalidArgumentException("A data informada não é válida.")
    }
    return normalized
  }

  private fun request(
    method: String,
    path: String,
    body: JSONObject? = null,
    idempotencyKey: String? = null,
  ): Pair<Int, String> {
    val token = QuickWidgetSecureStore.readSessionToken(applicationContext)
      ?.takeIf { it.isNotBlank() }
      ?: throw AppFunctionPermissionRequiredException(
        "Abra o CifraWealth, entre na sua conta e autorize a integração com o Gemini novamente."
      )

    val storedBaseUrl = QuickWidgetSecureStore.readApiBaseUrl(applicationContext)
      ?.trim()
      ?.trimEnd('/')
      ?.takeIf { it.startsWith("https://") }
      ?: throw AppFunctionPermissionRequiredException(
        "Abra o CifraWealth conectado à internet para configurar o acesso do assistente."
      )

    val apiBase = if (storedBaseUrl.endsWith("/api")) storedBaseUrl else "$storedBaseUrl/api"
    val connection = URL("$apiBase$path").openConnection() as HttpURLConnection
    try {
      connection.requestMethod = method
      connection.connectTimeout = 15_000
      connection.readTimeout = 20_000
      connection.setRequestProperty("Authorization", "Bearer $token")
      connection.setRequestProperty("Accept", "application/json")

      if (body != null) {
        connection.doOutput = true
        connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
        idempotencyKey?.let { connection.setRequestProperty("Idempotency-Key", it) }
        connection.outputStream.use { output ->
          output.write(body.toString().toByteArray(Charsets.UTF_8))
        }
      }

      val status = connection.responseCode
      val stream = if (status in 200..299) connection.inputStream else connection.errorStream
      val response = stream?.bufferedReader(Charsets.UTF_8)?.use { it.readText() }.orEmpty()
      return status to response
    } catch (_: IOException) {
      throw AppFunctionAppUnknownException("Não foi possível conectar ao CifraWealth. Verifique sua conexão e tente novamente.")
    } finally {
      connection.disconnect()
    }
  }

  private fun ensureSuccessful(status: Int, fallbackMessage: String) {
    when (status) {
      in 200..299 -> Unit
      400, 404, 409 -> throw AppFunctionInvalidArgumentException(
        "Não foi possível concluir a operação. Confira a categoria e os dados da transação."
      )
      401, 403 -> throw AppFunctionPermissionRequiredException(
        "Sua sessão do CifraWealth expirou. Abra o aplicativo para entrar novamente."
      )
      else -> throw AppFunctionAppUnknownException(fallbackMessage)
    }
  }
}
