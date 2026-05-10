package com.alba.core.network

object AlbaSupabase {
    @Volatile
    private var configured = false

    @Volatile
    var backendBaseUrl: String = "http://localhost:3000/v1"
        private set

    fun init(backendUrl: String, ignoredKey: String = "") {
        if (configured) return
        synchronized(this) {
            if (configured) return
            backendBaseUrl = normalizeBackendBaseUrl(System.getProperty("albago.backendUrl") ?: backendUrl)
            configured = true
        }
    }

    fun setBackendBaseUrl(value: String) {
        backendBaseUrl = normalizeBackendBaseUrl(value)
    }

    private fun normalizeBackendBaseUrl(value: String): String {
        return value.trim().trimEnd('/').ifBlank { "http://localhost:3000/v1" }
    }
}
