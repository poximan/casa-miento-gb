package rsvp.casamiento

object AppConfig {
    val DB_URL: String
        get() = BuildConfig.DB_URL
    val DB_USER: String
        get() = BuildConfig.DB_USER
    val DB_PASSWORD: String
        get() = BuildConfig.DB_PASSWORD

    val EMAIL_HOST: String
        get() = BuildConfig.EMAIL_HOST
    val EMAIL_PORT: String
        get() = BuildConfig.EMAIL_PORT
    val EMAIL_USER: String
        get() = BuildConfig.EMAIL_USER
    val EMAIL_PASS: String
        get() = BuildConfig.EMAIL_PASS
    val EMAIL_FROM: String
        get() = BuildConfig.EMAIL_FROM
}
