package rsvp.casamiento.data

import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import rsvp.casamiento.AppConfig
import rsvp.casamiento.model.GuestInfo
import rsvp.casamiento.model.RsvpRecord

data class AdminSummary(
    val yes: Int,
    val no: Int,
    val people: Int,
    val records: List<RsvpRecord>
)

class AdminApiClient(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val baseUrl: String = AppConfig.API_BASE_URL
) {
    suspend fun login(username: String, password: String): Result<String> = withContext(ioDispatcher) {
        request(
            method = "POST",
            path = "/api/admin-login",
            body = JSONObject()
                .put("username", username)
                .put("password", password)
                .toString()
        ).mapCatching { json ->
            json.optString("token").takeIf { it.isNotBlank() }
                ?: throw IllegalStateException("Token no recibido.")
        }
    }

    suspend fun fetchSummary(token: String): Result<AdminSummary> = withContext(ioDispatcher) {
        request(
            method = "GET",
            path = "/api/admin-summary",
            token = token
        ).mapCatching { json ->
            val rows = json.optJSONArray("rows") ?: JSONArray()
            val records = mutableListOf<RsvpRecord>()
            for (index in 0 until rows.length()) {
                val row = rows.optJSONObject(index) ?: continue
                records += RsvpRecord(
                    id = row.optInt("id"),
                    firstName = row.optString("primary_first_name"),
                    lastName = row.optString("primary_last_name"),
                    primaryMenu = row.optString("primary_menu").ifBlank { "sin menu" },
                    attending = row.optBoolean("attending"),
                    email = row.optString("email").ifBlank { null },
                    phone = row.optString("phone").ifBlank { null },
                    extraGuests = parseExtras(row.optJSONArray("extra_guests")),
                    createdAtEpochMs = parseEpochMillis(row.optString("created_at"))
                )
            }

            AdminSummary(
                yes = json.optInt("yes"),
                no = json.optInt("no"),
                people = json.optInt("people"),
                records = records
            )
        }
    }

    suspend fun sendBroadcast(token: String, filter: String, subject: String, body: String): Result<Int> =
        withContext(ioDispatcher) {
            request(
                method = "POST",
                path = "/api/admin-broadcast",
                token = token,
                body = JSONObject()
                    .put("filter", filter)
                    .put("subject", subject)
                    .put("message", body)
                    .toString()
            ).mapCatching { json ->
                json.optInt("sent").takeIf { it > 0 }
                    ?: throw IllegalStateException("El backend no envió correos (verifica destinatarios).")
            }
        }

    private fun request(
        method: String,
        path: String,
        token: String? = null,
        body: String? = null
    ): Result<JSONObject> {
        val connection = (URL("$baseUrl$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 10000
            readTimeout = 20000
            doInput = true
            setRequestProperty("Accept", "application/json")
            if (token != null) {
                setRequestProperty("Authorization", "Bearer $token")
            }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }

        return runCatching {
            if (body != null) {
                OutputStreamWriter(connection.outputStream, StandardCharsets.UTF_8).use { writer ->
                    writer.write(body)
                }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val responseText = stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()

            if (status == HttpURLConnection.HTTP_UNAUTHORIZED) {
                throw IllegalStateException("No autorizado (token inválido o vencido).")
            }

            if (status !in 200..299) {
                val detail = runCatching { JSONObject(responseText).optString("error") }.getOrDefault("")
                val message = detail.ifBlank { "Error HTTP $status" }
                throw IllegalStateException(message)
            }

            if (responseText.isBlank()) JSONObject() else JSONObject(responseText)
        }.also {
            connection.disconnect()
        }
    }

    private fun parseExtras(array: JSONArray?): List<GuestInfo> {
        if (array == null) return emptyList()
        return buildList {
            for (idx in 0 until array.length()) {
                val guest = array.optJSONObject(idx)
                if (guest != null) {
                    add(
                        GuestInfo(
                            name = listOf(
                                guest.optString("firstName"),
                                guest.optString("lastName")
                            ).joinToString(" ").trim().ifBlank { "Invitado extra" },
                            menu = guest.optString("menu").ifBlank { null }
                        )
                    )
                }
            }
        }
    }

    private fun parseEpochMillis(raw: String?): Long? {
        if (raw.isNullOrBlank()) return null
        return runCatching { java.time.Instant.parse(raw).toEpochMilli() }.getOrNull()
    }
}
