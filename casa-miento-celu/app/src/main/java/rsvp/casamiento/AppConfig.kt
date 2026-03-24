package rsvp.casamiento

object AppConfig {
    val API_BASE_URL: String
        get() = BuildConfig.API_BASE_URL.removeSuffix("/")
}
