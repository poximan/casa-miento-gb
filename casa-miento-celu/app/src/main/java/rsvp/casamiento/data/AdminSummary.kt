package rsvp.casamiento.data

import rsvp.casamiento.model.RsvpRecord

data class AdminSummary(
    val yes: Int,
    val no: Int,
    val people: Int,
    val records: List<RsvpRecord>
)
