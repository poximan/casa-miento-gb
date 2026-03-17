package rsvp.casamiento.ui

import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import java.util.Locale
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.flow.update
import kotlinx.coroutines.launch
import rsvp.casamiento.data.NeonRsvpRepository
import rsvp.casamiento.mail.EmailDiffusionSender
import rsvp.casamiento.model.OrganizerBootstrapCache
import rsvp.casamiento.model.RsvpRecord

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
    val lastSyncEpochMs: Long? = null
) {
    val yesCount: Int
        get() = records.count { it.attending }
    val noCount: Int
        get() = records.count { !it.attending }
    val totalPeople: Int
        get() = records.sumOf { it.personCount }
}

class OrganizerViewModel : ViewModel() {

    private val repository = NeonRsvpRepository()
    private val emailSender = EmailDiffusionSender()

    private val _uiState = MutableStateFlow(OrganizerUiState(isLoading = true))
    val uiState: StateFlow<OrganizerUiState> = _uiState.asStateFlow()

    init {
        val preload = OrganizerBootstrapCache.consume()
        if (preload != null) {
            _uiState.value = OrganizerUiState(
                isLoading = false,
                records = preload.records,
                errorMessage = preload.errorMessage,
                lastSyncEpochMs = System.currentTimeMillis()
            )
        } else {
            loadData()
        }
    }

    fun loadData() {
        viewModelScope.launch {
            _uiState.update { it.copy(isLoading = true, errorMessage = null) }
            val result = runCatching { repository.fetchRsvps() }
            result.fold(
                onSuccess = { records ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            records = records,
                            errorMessage = null,
                            lastSyncEpochMs = System.currentTimeMillis()
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isLoading = false,
                            errorMessage = error.message ?: "No se pudo conectar con Neon."
                        )
                    }
                }
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
        val recipients = recipientsFor(filter)
        if (recipients.isEmpty()) {
            _uiState.update {
                it.copy(sendMessage = "No hay destinatarios validos para el filtro seleccionado.")
            }
            return
        }

        viewModelScope.launch {
            _uiState.update { it.copy(isSendingEmail = true, sendMessage = null) }
            val result = emailSender.sendBroadcast(recipients = recipients, subject = subject, body = body)
            result.fold(
                onSuccess = { sent ->
                    _uiState.update {
                        it.copy(
                            isSendingEmail = false,
                            sendMessage = "Difusion enviada a $sent destinatarios."
                        )
                    }
                },
                onFailure = { error ->
                    _uiState.update {
                        it.copy(
                            isSendingEmail = false,
                            sendMessage = "Error de envio: ${error.message ?: "desconocido"}"
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
}
