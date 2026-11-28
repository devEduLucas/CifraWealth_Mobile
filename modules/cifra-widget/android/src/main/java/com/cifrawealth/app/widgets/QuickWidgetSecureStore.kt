package com.cifrawealth.app.widgets

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import org.json.JSONArray
import org.json.JSONObject
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/**
 * Private app storage encrypted with an AES-GCM key held by Android Keystore.
 * The widget session token and favorite payload are never kept as plaintext.
 */
object QuickWidgetSecureStore {
  private const val PREFS = "cifra_widget_private"
  private const val TOKEN_KEY = "widget_session_token_enc"
  private const val FAVORITES_KEY = "widget_favorites_enc"
  private const val STATUS_KEY = "widget_last_status"
  private const val KEY_ALIAS = "cifrawealth_widget_aes_gcm_v1"
  private const val ANDROID_KEYSTORE = "AndroidKeyStore"
  private const val TRANSFORMATION = "AES/GCM/NoPadding"
  private const val TAG_LENGTH_BITS = 128

  private fun prefs(context: Context) =
    context.getSharedPreferences(PREFS, Context.MODE_PRIVATE)

  private fun getOrCreateKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE).apply { load(null) }
    (keyStore.getKey(KEY_ALIAS, null) as? SecretKey)?.let { return it }

    val generator = KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    generator.init(
      KeyGenParameterSpec.Builder(
        KEY_ALIAS,
        KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT
      )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setRandomizedEncryptionRequired(true)
        .build()
    )
    return generator.generateKey()
  }

  private fun encrypt(value: String): String {
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateKey())
    val encrypted = cipher.doFinal(value.toByteArray(Charsets.UTF_8))
    val combined = cipher.iv + encrypted
    return Base64.encodeToString(combined, Base64.NO_WRAP)
  }

  private fun decrypt(value: String): String? {
    return try {
      val combined = Base64.decode(value, Base64.NO_WRAP)
      if (combined.size <= 12) return null
      val iv = combined.copyOfRange(0, 12)
      val encrypted = combined.copyOfRange(12, combined.size)
      val cipher = Cipher.getInstance(TRANSFORMATION)
      cipher.init(Cipher.DECRYPT_MODE, getOrCreateKey(), GCMParameterSpec(TAG_LENGTH_BITS, iv))
      String(cipher.doFinal(encrypted), Charsets.UTF_8)
    } catch (_: Exception) {
      null
    }
  }

  @Synchronized
  fun saveSessionToken(context: Context, token: String) {
    prefs(context).edit().putString(TOKEN_KEY, encrypt(token)).apply()
  }

  @Synchronized
  fun readSessionToken(context: Context): String? {
    val encrypted = prefs(context).getString(TOKEN_KEY, null) ?: return null
    val token = decrypt(encrypted)
    if (token.isNullOrBlank()) {
      prefs(context).edit().remove(TOKEN_KEY).apply()
      return null
    }
    return token
  }

  fun hasSession(context: Context): Boolean = !readSessionToken(context).isNullOrBlank()

  @Synchronized
  fun saveFavorites(context: Context, json: String) {
    val parsed = JSONArray(json)
    require(parsed.length() <= 4) { "The widget supports up to four favorites." }
    prefs(context).edit().putString(FAVORITES_KEY, encrypt(parsed.toString())).apply()
  }

  fun readFavorites(context: Context): JSONArray {
    val encrypted = prefs(context).getString(FAVORITES_KEY, null) ?: return JSONArray()
    val decoded = decrypt(encrypted) ?: return JSONArray()
    return try { JSONArray(decoded) } catch (_: Exception) { JSONArray() }
  }

  fun findFavorite(context: Context, favoriteId: Int): JSONObject? {
    val favorites = readFavorites(context)
    for (index in 0 until favorites.length()) {
      val favorite = favorites.optJSONObject(index) ?: continue
      if (favorite.optInt("id_widget_favorite", -1) == favoriteId) return favorite
    }
    return null
  }

  fun setLastStatus(context: Context, status: String) {
    prefs(context).edit().putString(STATUS_KEY, status.take(80)).apply()
  }

  fun readLastStatus(context: Context): String =
    prefs(context).getString(STATUS_KEY, null) ?: "Toque em um favorito para registrar."

  @Synchronized
  fun clear(context: Context) {
    prefs(context).edit().remove(TOKEN_KEY).remove(FAVORITES_KEY).remove(STATUS_KEY).apply()
  }

  @Synchronized
  fun clearSessionToken(context: Context) {
    prefs(context).edit().remove(TOKEN_KEY).apply()
  }
}
