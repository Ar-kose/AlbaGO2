package com.alba.core.network

import io.github.jan.supabase.SupabaseClient
import io.github.jan.supabase.createSupabaseClient
import io.github.jan.supabase.auth.Auth
import io.github.jan.supabase.postgrest.Postgrest
import io.github.jan.supabase.storage.Storage
import io.github.jan.supabase.realtime.Realtime
import kotlin.time.Duration.Companion.seconds

object AlbaSupabase {

    @Volatile
    private var _client: SupabaseClient? = null

    val client: SupabaseClient
        get() = _client ?: throw IllegalStateException("Supabase client not initialized. Call AlbaSupabase.init() first.")

    fun init(supabaseUrl: String, supabaseKey: String) {
        if (_client != null) return
        synchronized(this) {
            if (_client != null) return
            _client = createSupabaseClient(
                supabaseUrl = supabaseUrl,
                supabaseKey = supabaseKey
            ) {
                install(Auth)
                install(Postgrest) {
                    defaultSchema = "public"
                }
                install(Storage) {
                    transferTimeout = 120.seconds
                }
                install(Realtime) {
                    heartbeatInterval = 15.seconds
                }
            }
        }
    }
}
