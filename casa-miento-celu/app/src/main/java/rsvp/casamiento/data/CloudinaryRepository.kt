package rsvp.casamiento.data

import android.util.Base64
import kotlinx.coroutines.CoroutineDispatcher
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class CloudinaryRepository(
    private val ioDispatcher: CoroutineDispatcher = Dispatchers.IO,
    private val apiClient: OrganizerApiClient = OrganizerApiClient()
) {
    suspend fun listAssets(): List<CloudinaryAsset> = withContext(ioDispatcher) {
        val payload = apiClient.requestObject("/api/cloudinary-assets")
        val assets = payload.optJSONArray("assets") ?: JSONArray()
        buildList {
            for (index in 0 until assets.length()) {
                val item = assets.optJSONObject(index) ?: continue
                val publicId = item.optString("publicId").trim()
                val url = item.optString("url").trim()
                if (publicId.isNotBlank() && url.isNotBlank()) {
                    add(CloudinaryAsset(publicId = publicId, url = url))
                }
            }
        }
    }

    suspend fun deleteAssets(publicIds: List<String>) = withContext(ioDispatcher) {
        apiClient.requestObject(
            path = "/api/cloudinary-assets",
            method = "DELETE",
            body = JSONObject().put("publicIds", JSONArray().apply {
                publicIds.forEach { put(it) }
            }).toString()
        )
    }

    suspend fun uploadAsset(fileName: String, bytes: ByteArray, mimeType: String): CloudinaryAsset =
        withContext(ioDispatcher) {
            val payload = apiClient.requestObject(
                path = "/api/cloudinary-assets",
                method = "POST",
                body = JSONObject()
                    .put("fileName", fileName)
                    .put("mimeType", mimeType)
                    .put("base64Data", Base64.encodeToString(bytes, Base64.NO_WRAP))
                    .toString()
            )

            val asset = payload.optJSONObject("asset") ?: JSONObject()
            CloudinaryAsset(
                publicId = asset.optString("publicId").trim(),
                url = asset.optString("url").trim()
            )
        }
}
