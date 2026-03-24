package rsvp.casamiento

import android.content.Intent
import android.os.Bundle
import android.os.SystemClock
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import rsvp.casamiento.config.AppConfigurationValueProvider
import rsvp.casamiento.config.ConfigurationValidationService
import rsvp.casamiento.data.NeonRsvpRepository
import rsvp.casamiento.databinding.ActivitySplashBinding
import rsvp.casamiento.model.OrganizerBootstrapCache
import rsvp.casamiento.session.SessionManager
import rsvp.casamiento.ui.feedback.ConfigIssueFeedbackService
import rsvp.casamiento.ui.feedback.SnackbarConfigIssueFeedbackService

class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding
    private val configValidationService = ConfigurationValidationService(AppConfigurationValueProvider())
    private lateinit var configFeedbackService: ConfigIssueFeedbackService
    private lateinit var sessionManager: SessionManager
    private val repository = NeonRsvpRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        configFeedbackService = SnackbarConfigIssueFeedbackService(this)
        sessionManager = SessionManager(this)

        val missingKeys = configValidationService.findMissingKeys()
        if (missingKeys.isNotEmpty()) {
            configFeedbackService.showMissingConfig(binding.root, missingKeys) {
                finishAffinity()
            }
            return
        }

        val token = sessionManager.token()
        if (token.isNullOrBlank()) {
            goToLogin("Iniciá sesión para continuar.")
            return
        }

        bootstrap(token)
    }

    private fun goToLogin(reason: String? = null) {
        val intent = Intent(this, LoginActivity::class.java)
        intent.putExtra(LoginActivity.EXTRA_REASON, reason.orEmpty())
        startActivity(intent)
        finish()
    }

    private fun bootstrap(token: String) {
        lifecycleScope.launch {
            val startMs = SystemClock.elapsedRealtime()
            val fetchJob = async(Dispatchers.IO) {
                runCatching { repository.fetchSummary(token) }
            }

            while (!fetchJob.isCompleted) {
                val elapsed = SystemClock.elapsedRealtime() - startMs
                val progress = ((elapsed / 35L).toInt() + 5).coerceAtMost(94)
                binding.splashProgress.progress = progress
                binding.splashProgressLabel.text = getString(R.string.splash_loading, progress)
                delay(45)
            }

            val result = fetchJob.await()
            result.fold(
                onSuccess = { summary ->
                    OrganizerBootstrapCache.save(records = summary.records, errorMessage = null)
                    binding.splashProgress.progress = 100
                    binding.splashProgressLabel.text = getString(R.string.splash_loading, 100)
                    delay(250)
                    startActivity(Intent(this@SplashActivity, MainActivity::class.java))
                    finish()
                },
                onFailure = { error ->
                    val unauthorized = error.message?.contains("No autorizado", ignoreCase = true) == true
                    if (unauthorized) {
                        sessionManager.clear()
                        goToLogin("Sesión expirada. Volvé a iniciar sesión.")
                    } else {
                        OrganizerBootstrapCache.save(
                            records = emptyList(),
                            errorMessage = error.message ?: "No se pudo conectar con el backend."
                        )
                        binding.splashProgress.progress = 100
                        binding.splashProgressLabel.text = getString(R.string.splash_loading, 100)
                        delay(250)
                        startActivity(Intent(this@SplashActivity, MainActivity::class.java))
                        finish()
                    }
                }
            )
        }
    }
}
