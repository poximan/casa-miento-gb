package rsvp.casamiento.session

import android.content.Context

class SessionManager(context: Context) {
    private val prefs = context.getSharedPreferences("organizer_session", Context.MODE_PRIVATE)

    fun saveToken(token: String) {
        prefs.edit().putString("admin_token", token).apply()
    }

    fun token(): String? = prefs.getString("admin_token", null)

    fun clear() {
        prefs.edit().clear().apply()
    }
}
