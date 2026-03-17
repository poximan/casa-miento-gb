package rsvp.casamiento.model

data class GuestInfo(
    val name: String,
    val menu: String?
)

data class RsvpRecord(
    val id: Int,
    val firstName: String,
    val lastName: String,
    val primaryMenu: String,
    val attending: Boolean,
    val email: String?,
    val phone: String?,
    val extraGuests: List<GuestInfo>,
    val createdAtEpochMs: Long?
) {
    val fullName: String
        get() = listOf(firstName.trim(), lastName.trim()).filter { it.isNotBlank() }.joinToString(" ")

    val personCount: Int
        get() = 1 + extraGuests.size
}
