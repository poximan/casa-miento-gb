package rsvp.casamiento.data

import java.io.BufferedReader
import java.net.HttpURLConnection
import java.net.URL
import java.nio.charset.StandardCharsets
import org.json.JSONObject
import rsvp.casamiento.AppConfig

class OrganizerApiClient {
    fun requestObject(
        path: String,
        method: String = "GET",
        body: String? = null
    ): JSONObject {
        val connection = (URL(AppConfig.API_BASE_URL + path).openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 15000
            readTimeout = 30000
            doInput = true
            setRequestProperty("Accept", "application/json")
            setRequestProperty("Authorization", "Bearer ${AppConfig.MOBILE_ORGANIZER_TOKEN}")
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }

        return runCatching {
            if (body != null) {
                connection.outputStream.use { output ->
                    output.write(body.toByteArray(StandardCharsets.UTF_8))
                }
            }

            val status = connection.responseCode
            val stream = if (status in 200..299) connection.inputStream else connection.errorStream
            val response = stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            if (status !in 200..299) {
                throw IllegalStateException(parseErrorMessage(response, status))
            }
            if (response.isBlank()) JSONObject() else JSONObject(response)
        }.also {
            connection.disconnect()
        }.getOrThrow()
    }

    private fun parseErrorMessage(response: String, status: Int): String {
        val payload = runCatching { JSONObject(response) }.getOrNull()
        val code = payload?.optString("code").orEmpty()

        if (status == 401) {
            return "El backend rechazo el token tecnico de la app. " +
                "Revisa MOBILE_ORGANIZER_TOKEN en Android y en el deploy del backend."
        }

        if (code == "CONFIG_MISSING") {
            return "El backend remoto tiene configuracion incompleta. " +
                "Revisa variables de entorno del deploy."
        }

        return listOf(
            payload?.optString("error"),
            payload?.optString("hint"),
            payload?.optString("message")
        ).firstOrNull { !it.isNullOrBlank() } ?: "El backend devolvio HTTP $status."
    }
}
