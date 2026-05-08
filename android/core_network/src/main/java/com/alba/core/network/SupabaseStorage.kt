package com.alba.core.network

import java.io.File
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import kotlinx.serialization.SerialName
import kotlinx.serialization.Serializable
import kotlinx.serialization.json.JsonObject

object SupabaseStorage {
    suspend fun uploadAsset(file: File, mimeType: String = "image/png"): AssetFileRow? = withContext(Dispatchers.IO) {
        null
    }
}

@Serializable
data class AssetFileRow(
    val id: String = "",
    val path: String,
    @SerialName("storage_bucket") val storageBucket: String,
    @SerialName("public_url") val publicUrl: String? = null,
    @SerialName("mime_type") val mimeType: String? = null,
    val width: Int? = null,
    val height: Int? = null,
    @SerialName("size_bytes") val sizeBytes: Int? = null,
    val sha256: String? = null,
    val kind: String = "image",
    val format: String = "png",
    @SerialName("source_set") val sourceSet: JsonObject? = null,
    val title: String? = null,
    @SerialName("alt_text") val altText: String? = null,
    @SerialName("dominant_color") val dominantColor: String? = null,
    @SerialName("is_published") val isPublished: Boolean = false,
    val metadata: JsonObject? = null,
    @SerialName("created_at") val createdAt: String? = null
)
