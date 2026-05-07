package com.alba.core.network

import io.github.jan.supabase.auth.auth
import io.github.jan.supabase.auth.providers.builtin.Anonymous
import io.github.jan.supabase.postgrest.postgrest
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext

object SupabaseAuth {

    /**
     * Sign in anonymously and return the user ID.
     * Creates a profile row if one doesn't exist.
     */
    suspend fun signInAnonymously(installId: String, appVersion: String): ProfileRow? = withContext(Dispatchers.IO) {
        val client = AlbaSupabase.client

        // Sign in anonymously
        client.auth.signInWith(Anonymous)

        val userId = client.auth.currentUserOrNull()?.id ?: return@withContext null

        // Check if profile exists
        val existing = client.postgrest.from("profiles")
            .select { filter { "id" eq userId } }
            .decodeList<ProfileRow>()
            .firstOrNull()

        if (existing != null) return@withContext existing

        // Create profile
        val newProfile = client.postgrest.from("profiles")
            .insert(ProfileRow(id = userId, status = "guest", guestToken = installId)) {
                select()
            }
            .decodeSingle<ProfileRow>()

        // Register device
        client.postgrest.from("devices")
            .insert(
                DeviceRow(
                    profileId = userId,
                    installId = installId,
                    platform = "android",
                    appVersion = appVersion
                )
            )

        newProfile
    }

    suspend fun getCurrentProfile(): ProfileRow? = withContext(Dispatchers.IO) {
        val userId = AlbaSupabase.client.auth.currentUserOrNull()?.id ?: return@withContext null
        AlbaSupabase.client.postgrest.from("profiles")
            .select { filter { "id" eq userId } }
            .decodeList<ProfileRow>()
            .firstOrNull()
    }
}
