package rsvp.casamiento.ui.feedback

import android.content.Context
import android.util.Log
import androidx.appcompat.app.AlertDialog
import rsvp.casamiento.R
import rsvp.casamiento.config.ProtectedConfigKey

interface ConfigIssueFeedbackService {
    fun showMissingConfig(missingKeys: List<ProtectedConfigKey>, onClose: () -> Unit)
    fun showFatalError(message: String, onClose: () -> Unit)
}

class DialogConfigIssueFeedbackService(
    private val context: Context
) : ConfigIssueFeedbackService {
    override fun showMissingConfig(missingKeys: List<ProtectedConfigKey>, onClose: () -> Unit) {
        val joinedKeys = missingKeys.joinToString(", ") { it.keyName }
        val message = context.getString(R.string.config_error_message, joinedKeys)
        Log.e("ConfigIssueFeedback", message)

        AlertDialog.Builder(context)
            .setTitle(R.string.config_error_title)
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton(R.string.config_error_close) { _, _ -> onClose() }
            .show()
    }

    override fun showFatalError(message: String, onClose: () -> Unit) {
        Log.e("ConfigIssueFeedback", message)

        AlertDialog.Builder(context)
            .setTitle(R.string.fatal_error_title)
            .setMessage(message)
            .setCancelable(false)
            .setPositiveButton(R.string.config_error_close) { _, _ -> onClose() }
            .show()
    }
}
