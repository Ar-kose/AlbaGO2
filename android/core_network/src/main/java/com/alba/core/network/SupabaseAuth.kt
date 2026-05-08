package com.alba.core.network

import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object SupabaseAuth {
    private var currentProfile: ProfileRow? = null

    suspend fun signInAnonymously(installId: String, appVersion: String): ProfileRow? = withContext(Dispatchers.IO) {
        currentProfile ?: ProfileRow(
            id = "guest-$installId",
            displayName = "Guest",
            status = "guest",
            guestToken = installId
        ).also { currentProfile = it }
    }

    suspend fun getCurrentProfile(): ProfileRow? = withContext(Dispatchers.IO) {
        currentProfile
    }
}
