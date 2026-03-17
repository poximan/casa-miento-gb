package rsvp.casamiento.data

import java.net.HttpURLConnection
import java.net.URI
import java.net.URLEncoder
import java.net.URL
import java.nio.charset.StandardCharsets
import java.time.Instant
import java.time.LocalDateTime
import java.time.OffsetDateTime
import java.time.ZoneId
import java.time.format.DateTimeFormatter
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import rsvp.casamiento.AppConfig
import rsvp.casamiento.model.GuestInfo
import rsvp.casamiento.model.RsvpRecord

class NeonRsvpRepository(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    suspend fun fetchRsvps(): List<RsvpRecord> = withContext(ioDispatcher) {
        val query = """
            SELECT
                id,
                primary_first_name,
                primary_last_name,
                primary_menu,
                attending,
                email,
                phone,
                extra_guests::text AS extra_guests,
                created_at
            FROM rsvps
            ORDER BY created_at DESC
        """.trimIndent()

        val connectionString = buildConnectionString()
        val endpoint = neonSqlEndpoint(connectionString)
        val payload = JSONObject()
            .put("query", query)
            .put("params", JSONArray())
            .toString()

        val responseText = requestSql(
            endpoint = endpoint,
            connectionString = connectionString,
            payload = payload
        )

        parseRows(responseText)
    }

    private fun neonSqlEndpoint(connectionString: String): String {
        val uri = URI(connectionString)
        val host = uri.host?.takeIf { it.isNotBlank() }
            ?: throw IllegalStateException("No se pudo obtener host de Neon.")
        val authority = if (uri.port > 0) "$host:${uri.port}" else host
        return "https://$authority/sql"
    }

    private fun buildConnectionString(): String {
        val raw = AppConfig.DB_URL.removePrefix("jdbc:")
        val hasUserInfo = runCatching { URI(raw).userInfo?.isNotBlank() == true }.getOrDefault(false)
        if (hasUserInfo) return raw

        val user = AppConfig.DB_USER.trim()
        val pass = AppConfig.DB_PASSWORD.trim()
        if (user.isBlank() || pass.isBlank()) return raw

        val schemeSeparatorIndex = raw.indexOf("://")
        if (schemeSeparatorIndex < 0) return raw

        val encodedUser = encodeCredential(user)
        val encodedPass = encodeCredential(pass)
        val start = raw.substring(0, schemeSeparatorIndex + 3)
        val rest = raw.substring(schemeSeparatorIndex + 3)
        return "$start$encodedUser:$encodedPass@$rest"
    }

    private fun encodeCredential(value: String): String =
        URLEncoder.encode(value, StandardCharsets.UTF_8.name()).replace("+", "%20")

    private fun requestSql(endpoint: String, connectionString: String, payload: String): String {
        val connection = (URL(endpoint).openConnection() as HttpURLConnection).apply {
            requestMethod = "POST"
            connectTimeout = 10_000
            readTimeout = 20_000
            doOutput = true
            setRequestProperty("Content-Type", "application/json")
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Neon-Connection-String", connectionString)
            setRequestProperty("Neon-Raw-Text-Output", "true")
            setRequestProperty("Neon-Array-Mode", "true")
        }

        try {
            connection.outputStream.bufferedWriter().use { writer ->
                writer.write(payload)
            }

            val status = connection.responseCode
            val body = (if (status in 200..299) connection.inputStream else connection.errorStream)
                ?.bufferedReader()
                ?.use { it.readText() }
                .orEmpty()

            if (status !in 200..299) {
                throw IllegalStateException(readNeonError(body, status))
            }

            return body
        } finally {
            connection.disconnect()
        }
    }

    private fun readNeonError(body: String, status: Int): String {
        if (body.isBlank()) return "Neon devolvio HTTP $status."
        return runCatching {
            val json = JSONObject(body)
            json.optString("message")
                .ifBlank { json.optString("error") }
                .ifBlank { "Neon devolvio HTTP $status." }
        }.getOrElse { "Neon devolvio HTTP $status." }
    }

    private fun parseRows(jsonText: String): List<RsvpRecord> {
        if (jsonText.isBlank()) return emptyList()
        val json = JSONObject(jsonText)
        val fields = json.optJSONArray("fields") ?: JSONArray()
        val rows = json.optJSONArray("rows") ?: JSONArray()

        val indexByName = mutableMapOf<String, Int>()
        for (index in 0 until fields.length()) {
            val fieldName = fields.optJSONObject(index)?.optString("name").orEmpty()
            if (fieldName.isNotBlank()) {
                indexByName[fieldName] = index
            }
        }

        val records = mutableListOf<RsvpRecord>()
        for (rowIndex in 0 until rows.length()) {
            val row = rows.optJSONArray(rowIndex) ?: continue
            records += RsvpRecord(
                id = readString(row, indexByName, "id")?.toIntOrNull() ?: 0,
                firstName = readString(row, indexByName, "primary_first_name").orEmpty(),
                lastName = readString(row, indexByName, "primary_last_name").orEmpty(),
                primaryMenu = readString(row, indexByName, "primary_menu")
                    ?.trim()
                    .orEmpty()
                    .ifBlank { "sin menu" },
                attending = parseAttending(readString(row, indexByName, "attending")),
                email = readString(row, indexByName, "email")?.trim(),
                phone = readString(row, indexByName, "phone")?.trim(),
                extraGuests = parseExtraGuests(readString(row, indexByName, "extra_guests")),
                createdAtEpochMs = parseEpochMillis(readString(row, indexByName, "created_at"))
            )
        }

        return records
    }

    private fun readString(row: JSONArray, indexByName: Map<String, Int>, key: String): String? {
        val index = indexByName[key] ?: return null
        if (row.isNull(index)) return null
        return row.optString(index, null)
    }

    private fun parseAttending(raw: String?): Boolean {
        val value = raw?.trim()?.lowercase() ?: return false
        return value == "true" || value == "t" || value == "1" || value == "yes"
    }

    companion object {
        private val LOCAL_DATE_TIME_FORMATTERS = listOf(
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.S"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSS"),
            DateTimeFormatter.ofPattern("yyyy-MM-dd HH:mm:ss.SSSSSS")
        )
    }

    private fun parseEpochMillis(raw: String?, formatters: List<DateTimeFormatter> = LOCAL_DATE_TIME_FORMATTERS): Long? {
        if (raw.isNullOrBlank()) return null
        val value = raw.trim()

        runCatching { Instant.parse(value).toEpochMilli() }.getOrNull()?.let { return it }
        runCatching { OffsetDateTime.parse(value).toInstant().toEpochMilli() }.getOrNull()?.let { return it }
        for (formatter in formatters) {
            val parsed = runCatching {
                LocalDateTime.parse(value, formatter)
                    .atZone(ZoneId.systemDefault())
                    .toInstant()
                    .toEpochMilli()
            }.getOrNull()
            if (parsed != null) return parsed
        }
        return null
    }

    private fun parseExtraGuests(raw: String?): List<GuestInfo> {
        if (raw.isNullOrBlank() || raw == "null") return emptyList()
        return runCatching {
            val jsonArray = JSONArray(raw)
            buildList {
                for (index in 0 until jsonArray.length()) {
                    val value = jsonArray.get(index)
                    when (value) {
                        is JSONObject -> add(
                            GuestInfo(
                                name = parseGuestName(value),
                                menu = parseGuestMenu(value)
                            )
                        )

                        else -> add(
                            GuestInfo(
                                name = value.toString(),
                                menu = null
                            )
                        )
                    }
                }
            }
        }.getOrElse { emptyList() }
    }

    private fun parseGuestName(json: JSONObject): String {
        val first = pickString(
            json,
            "first_name",
            "firstName",
            "guest_first_name",
            "nombre",
            "name"
        )
        val last = pickString(
            json,
            "last_name",
            "lastName",
            "guest_last_name",
            "apellido",
            "lastname"
        )
        val composed = listOf(first, last).filter { !it.isNullOrBlank() }.joinToString(" ")
        return composed.ifBlank { "Invitado extra" }
    }

    private fun parseGuestMenu(json: JSONObject): String? = pickString(
        json,
        "menu",
        "guest_menu",
        "primary_menu",
        "tipo_menu"
    )?.trim()?.ifBlank { null }

    private fun pickString(json: JSONObject, vararg keys: String): String? {
        for (key in keys) {
            if (!json.has(key) || json.isNull(key)) continue
            val value = json.optString(key).trim()
            if (value.isNotBlank()) return value
        }
        return null
    }
}
