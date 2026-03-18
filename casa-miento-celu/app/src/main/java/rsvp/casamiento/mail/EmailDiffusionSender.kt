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
        val smtpUser = AppConfig.EMAIL_USER.trim().lowercase()
        val smtpPass = AppConfig.EMAIL_PASS.replace(" ", "").trim()
        val emailFrom = AppConfig.EMAIL_FROM.trim().lowercase()

        if (smtpUser.isBlank() || smtpPass.isBlank() || emailFrom.isBlank()) {
            return@withContext Result.failure(
                IllegalStateException("SMTP incompleto: revisa EMAIL_USER, EMAIL_FROM y EMAIL_PASS.")
            )
        }

        val attempt = runCatching {
            val session = buildSession(smtpUser, smtpPass)
            recipients.forEach { recipient ->
                val message = MimeMessage(session).apply {
                    setFrom(InternetAddress(emailFrom))
                    setRecipient(Message.RecipientType.TO, InternetAddress(recipient))
                    this.subject = subject
                    setText(body)
                }
                Transport.send(message)
            }
            recipients.size
        }

        if (attempt.isSuccess) {
            return@withContext Result.success(attempt.getOrThrow())
        }

        val lastError = attempt.exceptionOrNull()
        val friendly = humanizeSendError(lastError, smtpUser)
        Result.failure(IllegalStateException(friendly, lastError))
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

    private fun humanizeSendError(error: Throwable?, smtpUser: String): String {
        val message = error?.message.orEmpty()
        return when {
            message.contains("535", ignoreCase = true) ||
                (error is MessagingException && message.contains("BadCredentials", ignoreCase = true)) -> {
                "SMTP 535 (credenciales invalidas). Revisa EMAIL_USER y EMAIL_PASS " +
                    "(App Password de Gmail, 16 chars sin espacios)."
            }

            else -> message.ifBlank {
                "No se pudo enviar el correo (SMTP user: $smtpUser)."
            }
        }
    }
}
