package rsvp.casamiento.mail

import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONObject
import rsvp.casamiento.data.OrganizerApiClient
import rsvp.casamiento.model.RsvpRecord
import rsvp.casamiento.ui.RecipientFilter

class EmailDiffusionSender(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val apiClient: OrganizerApiClient = OrganizerApiClient()
) {
    suspend fun sendBroadcast(
        filter: RecipientFilter,
        records: List<RsvpRecord>,
        subject: String,
        body: String
    ): Result<Int> = withContext(ioDispatcher) {
        runCatching {
            if (records.isEmpty()) {
                throw IllegalStateException("No hay destinatarios para el filtro seleccionado.")
            }

            val payload = apiClient.requestObject(
                path = "/api/admin-broadcast",
                method = "POST",
                body = JSONObject()
                    .put("filter", when (filter) {
                        RecipientFilter.YES -> "yes"
                        RecipientFilter.NO -> "no"
                        RecipientFilter.ALL -> "all"
                    })
                    .put("subject", subject)
                    .put("message", body)
                    .toString()
            )

            payload.optInt("sent")
        }
    }
}
