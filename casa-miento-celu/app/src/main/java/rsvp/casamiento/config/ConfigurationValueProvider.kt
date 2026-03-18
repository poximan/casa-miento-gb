package rsvp.casamiento.config

import rsvp.casamiento.AppConfig

interface ConfigurationValueProvider {
    fun valueFor(key: ProtectedConfigKey): String
}

class AppConfigurationValueProvider : ConfigurationValueProvider {
    override fun valueFor(key: ProtectedConfigKey): String = when (key) {
        ProtectedConfigKey.DB_URL -> AppConfig.DB_URL
        ProtectedConfigKey.DB_USER -> AppConfig.DB_USER
        ProtectedConfigKey.DB_PASSWORD -> AppConfig.DB_PASSWORD
        ProtectedConfigKey.EMAIL_HOST -> AppConfig.EMAIL_HOST
        ProtectedConfigKey.EMAIL_PORT -> AppConfig.EMAIL_PORT
        ProtectedConfigKey.EMAIL_USER -> AppConfig.EMAIL_USER
        ProtectedConfigKey.EMAIL_PASS -> AppConfig.EMAIL_PASS
        ProtectedConfigKey.EMAIL_FROM -> AppConfig.EMAIL_FROM
    }
}
