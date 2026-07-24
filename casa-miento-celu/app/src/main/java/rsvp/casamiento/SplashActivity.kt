package rsvp.casamiento

import android.content.Intent
import android.os.Bundle
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.async
import kotlinx.coroutines.delay
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import rsvp.casamiento.config.AppConfigurationValueProvider
import rsvp.casamiento.config.ConfigurationValidationService
import rsvp.casamiento.data.NeonRsvpRepository
import rsvp.casamiento.databinding.ActivitySplashBinding
import rsvp.casamiento.model.OrganizerBootstrapCache
import rsvp.casamiento.ui.feedback.ConfigIssueFeedbackService
import rsvp.casamiento.ui.feedback.DialogConfigIssueFeedbackService

class SplashActivity : AppCompatActivity() {

    private lateinit var binding: ActivitySplashBinding
    private val configValidationService = ConfigurationValidationService(AppConfigurationValueProvider())
    private lateinit var configFeedbackService: ConfigIssueFeedbackService
    private val repository = NeonRsvpRepository()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivitySplashBinding.inflate(layoutInflater)
        setContentView(binding.root)
        configFeedbackService = DialogConfigIssueFeedbackService(this)

        val missingKeys = configValidationService.findMissingKeys()
        if (missingKeys.isNotEmpty()) {
            configFeedbackService.showMissingConfig(missingKeys) {
                finishAffinity()
            }
            return
        }

        bootstrap()
    }

    private fun bootstrap() {
        lifecycleScope.launch {
            val fetchJob = async(Dispatchers.IO) {
                runCatching { repository.fetchSummary() }
            }

            repeat(20) { step ->
                val progress = ((step + 1) * 5).coerceAtMost(100)
                binding.splashProgress.progress = progress
                binding.splashProgressLabel.text = getString(R.string.splash_loading, progress)
                delay(100)
            }

            binding.splashProgress.isIndeterminate = true
            binding.splashProgressLabel.text = getString(R.string.splash_syncing)

            fetchJob.await().fold(
                onSuccess = { summary ->
                    OrganizerBootstrapCache.save(records = summary.records, errorMessage = null)
                },
                onFailure = { error ->
                    OrganizerBootstrapCache.save(
                        records = emptyList(),
                        errorMessage = error.message ?: getString(R.string.bootstrap_error)
                    )
                }
            )

            withContext(Dispatchers.Main) {
                binding.splashProgress.isIndeterminate = false
            }

            startActivity(Intent(this@SplashActivity, MainActivity::class.java))
            finish()
        }
    }
}
