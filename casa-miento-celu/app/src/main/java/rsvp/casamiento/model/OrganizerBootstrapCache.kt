package rsvp.casamiento.model

object OrganizerBootstrapCache {
    data class Payload(
        val records: List<RsvpRecord>,
        val errorMessage: String?
    )

    @Volatile
    private var payload: Payload? = null

    fun save(records: List<RsvpRecord>, errorMessage: String?) {
        payload = Payload(records = records, errorMessage = errorMessage)
    }

    fun consume(): Payload? {
        val current = payload
        payload = null
        return current
    }
}
