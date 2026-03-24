package rsvp.casamiento

import android.content.Intent
import android.os.Bundle
import android.view.View
import androidx.appcompat.app.AppCompatActivity
import androidx.lifecycle.lifecycleScope
import kotlinx.coroutines.launch
import rsvp.casamiento.data.AdminApiClient
import rsvp.casamiento.databinding.ActivityLoginBinding
import rsvp.casamiento.session.SessionManager

class LoginActivity : AppCompatActivity() {

    private lateinit var binding: ActivityLoginBinding
    private val apiClient = AdminApiClient()
    private lateinit var sessionManager: SessionManager

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)
        sessionManager = SessionManager(this)

        val reason = intent?.getStringExtra(EXTRA_REASON).orEmpty()
        binding.loginReason.visibility = if (reason.isBlank()) View.GONE else View.VISIBLE
        binding.loginReason.text = reason

        binding.loginButton.setOnClickListener {
            attemptLogin()
        }
    }

    private fun attemptLogin() {
        val username = binding.usernameInput.text?.toString()?.trim().orEmpty()
        val password = binding.passwordInput.text?.toString().orEmpty()
        if (username.isBlank() || password.isBlank()) {
            binding.loginError.text = getString(R.string.required_field)
            binding.loginError.visibility = View.VISIBLE
            return
        }

        binding.loginError.visibility = View.GONE
        binding.loginButton.isEnabled = false
        binding.loginProgress.visibility = View.VISIBLE

        lifecycleScope.launch {
            val result = runCatching { apiClient.login(username, password).getOrThrow() }
            result.fold(
                onSuccess = { token ->
                    sessionManager.saveToken(token)
                    startActivity(Intent(this@LoginActivity, SplashActivity::class.java))
                    finish()
                },
                onFailure = { error ->
                    binding.loginError.text = error.message ?: getString(R.string.login_failed)
                    binding.loginError.visibility = View.VISIBLE
                    binding.loginButton.isEnabled = true
                    binding.loginProgress.visibility = View.GONE
                }
            )
        }
    }

    companion object {
        const val EXTRA_REASON = "login_reason"
    }
}
