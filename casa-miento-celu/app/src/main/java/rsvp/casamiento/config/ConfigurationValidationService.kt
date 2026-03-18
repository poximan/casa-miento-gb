package rsvp.casamiento.config

class ConfigurationValidationService(
    private val valueProvider: ConfigurationValueProvider = AppConfigurationValueProvider()
) {
    fun findMissingKeys(): List<ProtectedConfigKey> = ProtectedConfigKey.entries
        .filter { key -> valueProvider.valueFor(key).isBlank() }
}
