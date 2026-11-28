package __PACKAGE__

import android.app.PendingIntent
import android.content.Intent
import android.net.Uri
import androidx.annotation.RequiresApi
import androidx.appfunctions.AppFunctionDeclaration
import androidx.appfunctions.AppFunctionService
import androidx.appfunctions.AppFunctionServiceEntryPoint
import com.cifrawealth.app.MainActivity

/**
 * Exposes a single, privacy-preserving action to Android assistants.
 *
 * The assistant can only open the native CifraWealth voice-entry screen.
 * Financial values, descriptions, categories, balances and transaction history
 * are collected and handled inside the app, never as AppFunction parameters.
 */
@RequiresApi(36)
@AppFunctionServiceEntryPoint(
  serviceName = "CifraWealthAppFunctionService",
  appFunctionXmlFileName = "cifra_wealth_app_functions",
)
abstract class BaseCifraWealthAppFunctionService : AppFunctionService() {

  /**
   * Opens the native CifraWealth voice transaction composer.
   *
   * The user speaks directly to CifraWealth after the screen opens. The app
   * recognizes the speech locally through its existing speech-recognition
   * flow and lets the user review the draft before saving it.
   *
   * @return An immutable action that opens CifraWealth on its voice-entry screen.
   */
  @AppFunctionDeclaration(isDescribedByKDoc = true)
  suspend fun openVoiceTransactionEntry(): PendingIntent {
    val intent = Intent(this, MainActivity::class.java).apply {
      action = Intent.ACTION_VIEW
      data = Uri.parse("cifrawealth://assistente-voz")
      addFlags(
        Intent.FLAG_ACTIVITY_CLEAR_TOP or
          Intent.FLAG_ACTIVITY_SINGLE_TOP or
          Intent.FLAG_ACTIVITY_NEW_TASK
      )
    }

    return PendingIntent.getActivity(
      this,
      7301,
      intent,
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )
  }
}
