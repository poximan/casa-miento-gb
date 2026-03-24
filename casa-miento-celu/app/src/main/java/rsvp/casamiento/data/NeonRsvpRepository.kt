package rsvp.casamiento.data

class NeonRsvpRepository(
    private val apiClient: AdminApiClient = AdminApiClient()
) {
    suspend fun fetchSummary(token: String): AdminSummary =
        apiClient.fetchSummary(token).getOrThrow()
}
