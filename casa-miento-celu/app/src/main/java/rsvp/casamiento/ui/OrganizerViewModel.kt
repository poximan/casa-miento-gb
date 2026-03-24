package rsvp.casamiento.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.ViewModelProvider
import androidx.lifecycle.viewModelScope
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import rsvp.casamiento.data.AdminSummary
import rsvp.casamiento.data.NeonRsvpRepository
import rsvp.casamiento.mail.EmailDiffusionSender
import rsvp.casamiento.model.OrganizerBootstrapCache
import rsvp.casamiento.model.RsvpRecord
import rsvp.casamiento.session.SessionManager

enum class RecipientFilter {
    YES,
    NO,
    ALL
}

data class OrganizerUiState(
    val isLoading: Boolean = false,
    val isSendingEmail: Boolean = false,
    val records: List<RsvpRecord> = emptyList(),
    val errorMessage: String? = null,
    val sendMessage: String? = null,
    val lastSyncEpochMs: Long? = null,
    val authError: Boolean = false
) {
    val yesCount: Int
        get() = records.count { it.attending }
    val noCount: Int
        get() = records.count { !it.attending }
    val totalPeople: Int
        get() = records.sumOf { it.personCount }
}

class OrganizerViewModel(
    private val repository: NeonRsvpRepository,
    private val emailSender: EmailDiffusionSender,
    private val sessionManager: SessionManager
) : ViewModel() {

    private val _uiState = MutableStateFlow(OrganizerUiState(isLoading = true))
    val uiState: StateFlow<OrganizerUiState> = _uiState.asStateFlow()

    init {
        val preload = OrganizerBootstrapCache.consume()
        if (preload != null) {
            _uiState.value = OrganizerUiState(
                isLoading = false,
                records = preload.records,
                errorMessage = preload.errorMessage,
                lastSyncEpochMs = System.currentTimeMillis(),
                authError = preload.errorMessage?.contains("token", ignoreCase = true) == true
            )
        } else {
            loadData()
        }
    }

    fun setToken(token: String) {
        sessionManager.saveToken(token)
    }

    fun clearToken() {
        sessionManager.clear()
        _uiState.update { it.copy(authError = true, errorMessage = "Sesión expirada o no iniciada.") }
    }

    fun loadData() {
        val token = sessionManager.token().orEmpty()
        if (token.isBlank()) {
            _uiState.update { it.copy(isLoading = false, authError = true, errorMessage = "Falta token de acceso.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null, authError = false) }
            val result = runCatching { repository.fetchSummary(token) }
            result.fold(
                onSuccess = { summary ->
                    applySummary(summary)
                },
                onFailure = { error ->
                    val authFailed = error.message?.contains("No autorizado", ignoreCase = true) == true
                    if (authFailed) {
                        clearToken()
                    }
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "No se pudo conectar con el backend.",
                            authError = authFailed
                        )
                    }
                }
            )
        }
    }

    private fun applySummary(summary: AdminSummary) {
        _uiState.update {
            it.copy(
                isLoading = false,
                records = summary.records,
                errorMessage = null,
                lastSyncEpochMs = System.currentTimeMillis(),
                authError = false
            )
        }
    }

    fun menuCounts(records: List<RsvpRecord>): List<Pair<String, Int>> {
        val counts = linkedMapOf<String, Int>()
        records.filter { it.attending }.forEach { record ->
            bump(counts, record.primaryMenu)
            record.extraGuests.forEach { guest ->
                bump(counts, guest.menu ?: "sin menu")
            }
        }
        return counts.entries
            .sortedByDescending { it.value }
            .map { it.key to it.value }
    }

    fun recipientCountFor(filter: RecipientFilter): Int = recipientsFor(filter).size

    fun sendBroadcast(filter: RecipientFilter, subject: String, body: String) {
        val token = sessionManager.token().orEmpty()
        if (token.isBlank()) {
            _uiState.update { it.copy(sendMessage = "Sesión expirada. Inicia sesión nuevamente.") }
            return
        }

        if (subject.isBlank() || body.isBlank()) {
            _uiState.update { it.copy(sendMessage = "Asunto y mensaje son obligatorios.") }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSendingEmail = true, sendMessage = null) }
            val result = emailSender.sendBroadcast(
                token = token,
                filter = filter,
                subject = subject,
                body = body
            )
            result.fold(
                onSuccess = { sent ->
                    _uiState.update {
                        it.copy(
                            isSendingEmail = false,
                            sendMessage = "Difusión enviada a $sent destinatarios."
                        )
                    }
                },
                onFailure = { error ->
                    val authFailed = error.message?.contains("No autorizado", ignoreCase = true) == true
                    if (authFailed) clearToken()
                    _uiState.update {
                        it.copy(
                            isSendingEmail = false,
                            sendMessage = "Error de envío: ${error.message ?: "desconocido"}",
                            authError = authFailed
                        )
                    }
                }
            )
        }
    }

    fun clearSendMessage() {
        _uiState.update { it.copy(sendMessage = null) }
    }

    private fun recipientsFor(filter: RecipientFilter): List<String> {
        val source = when (filter) {
            RecipientFilter.YES -> _uiState.value.records.filter { it.attending }
            RecipientFilter.NO -> _uiState.value.records.filter { !it.attending }
            RecipientFilter.ALL -> _uiState.value.records
        }

        return source.mapNotNull { record ->
            record.email?.trim()?.takeIf { it.isNotBlank() }
        }.distinctBy { it.lowercase(Locale.ROOT) }
    }

    private fun bump(map: MutableMap<String, Int>, rawMenu: String) {
        val key = rawMenu.trim().ifBlank { "sin menu" }.lowercase(Locale.ROOT)
        map[key] = (map[key] ?: 0) + 1
    }

    companion object {
        fun factory(sessionManager: SessionManager): ViewModelProvider.Factory =
            object : ViewModelProvider.Factory {
                override fun <T : ViewModel> create(modelClass: Class<T>): T {
                    @Suppress("UNCHECKED_CAST")
                    return OrganizerViewModel(
                        repository = NeonRsvpRepository(),
                        emailSender = EmailDiffusionSender(),
                        sessionManager = sessionManager
                    ) as T
                }
            }
    }
}
