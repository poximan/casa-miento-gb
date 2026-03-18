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
import rsvp.casamiento.ui.feedback.ConfigIssueFeedbackService
import rsvp.casamiento.ui.feedback.SnackbarConfigIssueFeedbackService

class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding
    private val configValidationService = ConfigurationValidationService(AppConfigurationValueProvider())
    private lateinit var configFeedbackService: ConfigIssueFeedbackService

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        configFeedbackService = SnackbarConfigIssueFeedbackService(this)

        val missingKeys = configValidationService.findMissingKeys()
        if (missingKeys.isNotEmpty()) {
            configFeedbackService.showMissingConfig(binding.root, missingKeys) {
                finishAffinity()
            }
            return
        }

        bootstrap()
    }

    private fun bootstrap() {
        lifecycleScope.launch {
            val startMs = SystemClock.elapsedRealtime()
            val repository = NeonRsvpRepository()
            val fetchJob = async(Dispatchers.IO) {
                runCatching { repository.fetchRsvps() }
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
                onSuccess = { records ->
                    OrganizerBootstrapCache.save(records = records, errorMessage = null)
                },
                onFailure = { error ->
                    OrganizerBootstrapCache.save(
                        records = emptyList(),
                        errorMessage = error.message ?: "No se pudo conectar con Neon."
                    )
                }
            )

            binding.splashProgress.progress = 100
            binding.splashProgressLabel.text = getString(R.string.splash_loading, 100)
            delay(250)

            startActivity(Intent(this@SplashActivity, MainActivity::class.java))
            finish()
        }
    }
}
