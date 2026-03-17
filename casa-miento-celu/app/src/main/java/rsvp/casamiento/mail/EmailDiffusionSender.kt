package rsvp.casamiento.mail

import java.util.Properties
import javax.mail.Authenticator
import javax.mail.Message
import javax.mail.MessagingException
import javax.mail.PasswordAuthentication
import javax.mail.Session
import javax.mail.Transport
import javax.mail.internet.InternetAddress
import javax.mail.internet.MimeMessage
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import rsvp.casamiento.AppConfig

class EmailDiffusionSender(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO
) {
    suspend fun sendBroadcast(
        recipients: List<String>,
        subject: String,
        body: String
    ): Result<Int> = withContext(ioDispatcher) {
        val smtpPass = AppConfig.EMAIL_PASS.replace(" ", "").trim()
        val authCandidates = buildAuthCandidates()

        if (smtpPass.isBlank() || authCandidates.isEmpty()) {
            return@withContext Result.failure(
                IllegalStateException("SMTP incompleto: revisa EMAIL_USER/EMAIL_FROM y EMAIL_PASS.")
            )
        }

        var lastError: Throwable? = null
        var usedUser: String? = null

        for (smtpUser in authCandidates) {
            val attempt = runCatching {
                val session = buildSession(smtpUser, smtpPass)
                recipients.forEach { recipient ->
                    val message = MimeMessage(session).apply {
                        setFrom(InternetAddress(smtpUser))
                        setRecipient(Message.RecipientType.TO, InternetAddress(recipient))
                        this.subject = subject
                        setText(body)
                    }
                    Transport.send(message)
                }
                usedUser = smtpUser
                recipients.size
            }

            if (attempt.isSuccess) {
                return@withContext Result.success(attempt.getOrThrow())
            }

            lastError = attempt.exceptionOrNull()
            if (!isAuthError(lastError)) {
                break
            }
        }

        val friendly = humanizeSendError(lastError, authCandidates, usedUser)
        Result.failure(IllegalStateException(friendly, lastError))
    }

    private fun buildAuthCandidates(): List<String> {
        val emailUser = AppConfig.EMAIL_USER.trim()
        val emailFrom = AppConfig.EMAIL_FROM.trim()
        return listOf(emailUser, emailFrom)
            .map { it.lowercase() }
            .filter { it.isNotBlank() && it.contains("@") }
            .distinct()
    }

    private fun buildSession(smtpUser: String, smtpPass: String): Session {
        val properties = Properties().apply {
            put("mail.smtp.host", AppConfig.EMAIL_HOST)
            put("mail.smtp.port", AppConfig.EMAIL_PORT)
            put("mail.smtp.auth", "true")
            put("mail.smtp.starttls.enable", "true")
            put("mail.smtp.starttls.required", "true")
            put("mail.smtp.ssl.protocols", "TLSv1.2")
            put("mail.smtp.connectiontimeout", "10000")
            put("mail.smtp.timeout", "20000")
            put("mail.smtp.writetimeout", "20000")
        }

        return Session.getInstance(
            properties,
            object : Authenticator() {
                override fun getPasswordAuthentication(): PasswordAuthentication =
                    PasswordAuthentication(smtpUser, smtpPass)
            }
        )
    }

    private fun isAuthError(error: Throwable?): Boolean {
        if (error == null) return false
        val message = error.message.orEmpty()
        return message.contains("535", ignoreCase = true) ||
            message.contains("BadCredentials", ignoreCase = true)
    }

    private fun humanizeSendError(
        error: Throwable?,
        authCandidates: List<String>,
        usedUser: String?
    ): String {
        val message = error?.message.orEmpty()
        val usersTried = authCandidates.joinToString(", ")
        return when {
            message.contains("535", ignoreCase = true) || error is MessagingException &&
                message.contains("BadCredentials", ignoreCase = true) -> {
                "SMTP 535 (credenciales invalidas). Usuarios probados: $usersTried. " +
                    "Usa App Password de Gmail (16 chars sin espacios) de la misma cuenta."
            }

            else -> message.ifBlank {
                val userInfo = usedUser ?: usersTried.ifBlank { "sin usuario" }
                "No se pudo enviar el correo (SMTP user: $userInfo)."
            }
        }
    }
}
