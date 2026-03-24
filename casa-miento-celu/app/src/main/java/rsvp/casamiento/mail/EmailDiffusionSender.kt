package rsvp.casamiento.mail

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import rsvp.casamiento.data.AdminApiClient
import rsvp.casamiento.ui.RecipientFilter

class EmailDiffusionSender(
    private val apiClient: AdminApiClient = AdminApiClient(),
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    suspend fun sendBroadcast(
        token: String,
        filter: RecipientFilter,
        subject: String,
        body: String
    ): Result<Int> = withContext(ioDispatcher) {
        val filterValue = when (filter) {
            RecipientFilter.YES -> "yes"
            RecipientFilter.NO -> "no"
            RecipientFilter.ALL -> "all"
        }

        apiClient.sendBroadcast(
            token = token,
            filter = filterValue,
            subject = subject,
            body = body
        )
    }
}
