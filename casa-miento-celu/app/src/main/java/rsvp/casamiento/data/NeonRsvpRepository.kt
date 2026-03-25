package rsvp.casamiento.data

import java.time.Instant
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import rsvp.casamiento.model.GuestInfo
import rsvp.casamiento.model.RsvpRecord

class NeonRsvpRepository(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val apiClient: OrganizerApiClient = OrganizerApiClient()
) {
    suspend fun fetchSummary(): AdminSummary = withContext(ioDispatcher) {
        val payload = apiClient.requestObject("/api/admin-summary")
        val rows = payload.optJSONArray("rows") ?: JSONArray()
        val records = buildList {
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                add(
                    RsvpRecord(
                        id = row.optInt("id"),
                        firstName = row.optString("primary_first_name").orEmpty(),
                        lastName = row.optString("primary_last_name").orEmpty(),
                        primaryMenu = row.optString("primary_menu").orEmpty(),
                        attending = row.optBoolean("attending"),
                        email = row.optString("email").trim().ifBlank { null },
                        phone = row.optString("phone").trim().ifBlank { null },
                        extraGuests = parseExtras(row.opt("extra_guests")),
                        createdAtEpochMs = parseEpochMillis(row.optString("created_at"))
                    )
                )
            }
        }

        AdminSummary(
            yes = payload.optInt("yes"),
            no = payload.optInt("no"),
            people = payload.optInt("people"),
            records = records
        )
    }

    suspend fun fetchPublishedCarouselUrls(): List<String> = withContext(ioDispatcher) {
        val payload = apiClient.requestObject("/api/admin-photos")
        val publications = payload.optJSONArray("publications") ?: JSONArray()

        buildList {
            for (index in 0 until publications.length()) {
                val publication = publications.optJSONObject(index) ?: continue
                val urls = publication.optJSONArray("urls") ?: continue
                for (urlIndex in 0 until urls.length()) {
                    val url = urls.optString(urlIndex).trim()
                    if (url.isNotBlank()) {
                        add(url)
                    }
                }
            }
        }.distinct()
    }

    suspend fun publishCarouselUrls(urls: List<String>) = withContext(ioDispatcher) {
        apiClient.requestObject(
            path = "/api/admin-photos",
            method = "POST",
            body = JSONObject().put("photos", JSONArray().apply {
                urls.forEach { put(it) }
            }).toString()
        )
    }

    private fun parseExtras(rawValue: Any?): List<GuestInfo> {
        val array = when (rawValue) {
            is JSONArray -> rawValue
            is String -> rawValue.takeIf { it.isNotBlank() }?.let(::JSONArray)
            else -> null
        } ?: return emptyList()

        return buildList {
            for (index in 0 until array.length()) {
                val guest = array.optJSONObject(index) ?: continue
                add(
                    GuestInfo(
                        name = listOf(guest.optString("firstName"), guest.optString("lastName"))
                            .joinToString(" ")
                            .trim(),
                        menu = guest.optString("menu").trim().ifBlank { null }
                    )
                )
            }
        }
    }

    private fun parseEpochMillis(rawValue: String?): Long? {
        val value = rawValue?.trim().orEmpty()
        if (value.isBlank()) return null
        return runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()
    }
}
