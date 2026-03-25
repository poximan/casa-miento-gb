package rsvp.casamiento

object AppConfig {
    val API_BASE_URL: String
        get() = BuildConfig.API_BASE_URL.trim().removeSuffix("/")

    val MOBILE_ORGANIZER_TOKEN: String
        get() = BuildConfig.MOBILE_ORGANIZER_TOKEN.trim()
}
