package com.alba.core.network

import io.github.jan.supabase.storage.storage
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import java.io.File

object SupabaseStorage {

    /**
     * Upload a file to the albago-assets bucket and create an asset_files record.
     */
    suspend fun uploadAsset(file: File, mimeType: String = "image/png"): AssetFileRow? = withContext(Dispatchers.IO) {
        val client = AlbaSupabase.client
        val bucket = client.storage.from("albago-assets")
        val filePath = "uploads/${System.currentTimeMillis()}_${file.name}"

        // Upload to storage
        bucket.upload(filePath, file.readBytes()) { upsert = false }

        // Get public URL
        val publicUrl = bucket.publicUrl(filePath)

        // Insert asset_files record
        val kind = if (mimeType.startsWith("audio")) "audio" else "image"
        val format = file.extension.lowercase()

        client.postgrest.from("asset_files")
            .insert(
                AssetFileRow(
                    path = filePath,
                    storageBucket = "albago-assets",
                    publicUrl = publicUrl,
                    mimeType = mimeType,
                    sizeBytes = file.length().toInt(),
                    kind = kind,
                    format = format,
                    isPublished = true
                )
            ) {
                select()
            }
            .decodeSingleOrNull<AssetFileRow>()
    }
}

@kotlinx.serialization.Serializable
data class AssetFileRow(
    val id: String = "",
    val path: String,
    @kotlinx.serialization.SerialName("storage_bucket") val storageBucket: String,
    @kotlinx.serialization.SerialName("public_url") val publicUrl: String? = null,
    @kotlinx.serialization.SerialName("mime_type") val mimeType: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    @kotlinx.serialization.SerialName("size_bytes") val sizeBytes: Int? = null,
    val sha256: String? = null,
    val kind: String = "image",
    val format: String = "png",
    @kotlinx.serialization.SerialName("source_set") val sourceSet: kotlinx.serialization.json.JsonObject? = null,
    val title: String? = null,
    @kotlinx.serialization.SerialName("alt_text") val altText: String? = null,
    @kotlinx.serialization.SerialName("dominant_color") val dominantColor: String? = null,
    @kotlinx.serialization.SerialName("is_published") val isPublished: Boolean = false,
    val metadata: kotlinx.serialization.json.JsonObject? = null,
    @kotlinx.serialization.SerialName("created_at") val createdAt: String? = null
)
