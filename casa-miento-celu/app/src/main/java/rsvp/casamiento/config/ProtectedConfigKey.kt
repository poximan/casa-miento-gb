package rsvp.casamiento.config

enum class ProtectedConfigKey(val keyName: String) {
    DB_URL("DB_URL"),
    DB_USER("DB_USER"),
    DB_PASSWORD("DB_PASSWORD"),
    EMAIL_HOST("EMAIL_HOST"),
    EMAIL_PORT("EMAIL_PORT"),
    EMAIL_USER("EMAIL_USER"),
    EMAIL_PASS("EMAIL_PASS"),
    EMAIL_FROM("EMAIL_FROM")
}
