package rsvp.casamiento.ui.feedback

import android.content.Context
import android.view.View
import com.google.android.material.snackbar.Snackbar
import rsvp.casamiento.R
import rsvp.casamiento.config.ProtectedConfigKey

interface ConfigIssueFeedbackService {
    fun showMissingConfig(rootView: View, missingKeys: List<ProtectedConfigKey>, onClose: () -> Unit)
}

class SnackbarConfigIssueFeedbackService(
    private val context: Context
) : ConfigIssueFeedbackService {
    override fun showMissingConfig(rootView: View, missingKeys: List<ProtectedConfigKey>, onClose: () -> Unit) {
        val joinedKeys = missingKeys.joinToString(", ") { it.keyName }
        val message = context.getString(R.string.config_error_snackbar, joinedKeys)

        Snackbar.make(rootView, message, Snackbar.LENGTH_INDEFINITE)
            .setAction(context.getString(R.string.config_error_close)) { onClose() }
            .show()
    }
}
