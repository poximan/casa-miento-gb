package rsvp.casamiento.config

import rsvp.casamiento.AppConfig

interface ConfigurationValueProvider {
    fun valueFor(key: ProtectedConfigKey): String
}

class AppConfigurationValueProvider : ConfigurationValueProvider {
    override fun valueFor(key: ProtectedConfigKey): String = when (key) {
        ProtectedConfigKey.API_BASE_URL -> AppConfig.API_BASE_URL
        ProtectedConfigKey.MOBILE_ORGANIZER_TOKEN -> AppConfig.MOBILE_ORGANIZER_TOKEN
    }
}
